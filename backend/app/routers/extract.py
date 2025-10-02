from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Dict, List
import base64
import io
import time
import logging

from ..schemas import ExtractResponse, ModelOutput, ModelMeta, ElementCounts
from ..adapters import get_adapter, KNOWN_MODELS
from ..utils.pdf import load_pdf_doc, render_page_image, have_fitz, fitz_import_error
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
    page_start: int | None = Form(None),
    page_end: int | None = Form(None),
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
    fitz_ok = have_fitz()
    total_pages = len(doc)
    # normalize range
    if page_start is not None and page_start < 1:
        page_start = 1
    if page_end is not None and page_end > total_pages:
        page_end = total_pages
    if page_start is not None and page_end is not None and page_start > page_end:
        raise HTTPException(status_code=400, detail="page_start cannot be greater than page_end")
    start_idx = (page_start - 1) if page_start else 0
    end_idx = (page_end - 1) if page_end else (total_pages - 1)
    pages_to_process = (end_idx - start_idx + 1)

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
        for i in range(start_idx, start_idx + pages_to_process):
            img = render_page_image(doc, i, dpi=96)
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

        warn_confidence = None
        if not fitz_ok:
            # degrade confidence if running in fallback
            warn_confidence = 0.2
        meta = ModelMeta(
            time_ms=round(elapsed_ms, 2),
            block_count=total_blocks,
            ocr_box_count=ocr_boxes,
            char_count=len(text_md or ""),
            word_count=len((text_md or "").split()),
            element_counts=ElementCounts(),
            confidence=warn_confidence,
        )

        outputs[model_name] = ModelOutput(
            text_markdown=text_md,
            annotated_images=annotated_images,
            meta=meta,
        )

    if not fitz_ok:
        # Attach a pseudo-model with diagnostic info maybe or include warning header
        # Simpler: add a warning field via HTTP header? For now embed first model meta text preface.
        pass
    return ExtractResponse(pages=pages_to_process, models=outputs)
