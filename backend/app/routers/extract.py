from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, List
import base64
import io

from ..schemas import ExtractResponse, ModelOutput
from ..adapters import get_adapter, KNOWN_MODELS
from ..utils.pdf import load_pdf_doc, render_page_image
from ..utils.annotate import annotate_blocks

router = APIRouter(tags=["extract"])


@router.post("/extract", response_model=ExtractResponse)
async def extract(
    file: UploadFile = File(...),
    models: str = Form("surya,docling,mineru"),
    max_pages: int = Form(5),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file.")

    doc = load_pdf_doc(pdf_bytes)
    total_pages = len(doc)
    pages_to_process = min(total_pages, max_pages if max_pages > 0 else total_pages)

    selection = [m.strip().lower() for m in models.split(",") if m.strip()]
    if not selection:
        selection = KNOWN_MODELS

    outputs: Dict[str, ModelOutput] = {}

    for model_name in selection:
        adapter = get_adapter(model_name)
        text_md, blocks_by_page = adapter.extract(doc, max_pages=pages_to_process)

        annotated_images: List[str] = []
        for i in range(pages_to_process):
            img = render_page_image(doc, i, dpi=144)
            page_rect = (doc[i].rect.width, doc[i].rect.height)
            annotated = annotate_blocks(img, blocks_by_page.get(i, []), page_rect)

            buf = io.BytesIO()
            annotated.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            annotated_images.append(f"data:image/png;base64,{b64}")

        outputs[model_name] = ModelOutput(
            text_markdown=text_md,
            annotated_images=annotated_images,
        )

    return ExtractResponse(pages=pages_to_process, models=outputs)
