from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Dict, List
import base64
import io
import time
import logging

from ..schemas import ExtractResponse, ModelOutput, ModelMeta, ElementCounts
from ..adapters import get_adapter, KNOWN_MODELS
from ..utils.pdf import load_pdf_doc, render_page_image
from ..utils.annotate import annotate_blocks

logger = logging.getLogger(__name__)
router = APIRouter(tags=["extract"])


# Simple in-memory rate limiter (best-effort)
_RATE: Dict[str, List[float]] = {}
_MAX_REQ_PER_MIN = 12


def _allow_request(ip: str) -> bool:
    now = time.time()
    window_start = now - 60.0
    buf = _RATE.setdefault(ip, [])
    # prune
    while buf and buf[0] < window_start:
        buf.pop(0)
    if len(buf) >= _MAX_REQ_PER_MIN:
        return False
    buf.append(now)
    return True


MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB


@router.post("/extract", response_model=ExtractResponse)
async def extract(
    request: Request,
    file: UploadFile = File(...),
    models: str = Form("surya,docling,mineru"),
):
    client_ip = request.client.host if request.client else "unknown"
    if not _allow_request(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(pdf_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Max 15MB.")

    doc = load_pdf_doc(pdf_bytes)
    total_pages = len(doc)
    pages_to_process = total_pages

    selection = [m.strip().lower() for m in models.split(",") if m.strip()]
    if not selection:
        selection = KNOWN_MODELS

    outputs: Dict[str, ModelOutput] = {}

    for model_name in selection:
        adapter = get_adapter(model_name)
        start = time.perf_counter()
        text_md, blocks_by_page = adapter.extract(doc)
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        annotated_images: List[str] = []
        total_blocks = 0
        ocr_boxes = 0
        for i in range(pages_to_process):
            img = render_page_image(doc, i, dpi=144)
            page_rect = (doc[i].rect.width, doc[i].rect.height)
            page_blocks = blocks_by_page.get(i, [])
            total_blocks += len(page_blocks)
            # Heuristic: OCR boxes appended after pm_blocks in adapters; approximate OCR count
            # Split by half if both existed; otherwise 0
            # If adapters keep OCR boxes after pm_blocks, we can estimate as max(0, len(page_blocks) - len(pm_blocks)).
            # Without exact split, leave ocr_boxes as 0 and improve later if needed.
            annotated = annotate_blocks(img, page_blocks, page_rect)

            buf = io.BytesIO()
            annotated.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            annotated_images.append(f"data:image/png;base64,{b64}")

        meta = ModelMeta(
            time_ms=round(elapsed_ms, 2),
            block_count=total_blocks,
            ocr_box_count=ocr_boxes,
            char_count=len(text_md or ""),
            word_count=len((text_md or "").split()),
            element_counts=ElementCounts(),
            confidence=None,
        )

        outputs[model_name] = ModelOutput(
            text_markdown=text_md,
            annotated_images=annotated_images,
            meta=meta,
        )

    return ExtractResponse(pages=pages_to_process, models=outputs)
