from __future__ import annotations
from typing import Dict, List, Tuple
try:
    import fitz  # type: ignore
except Exception:
    fitz = None  # type: ignore

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image, have_fitz
from ..utils.ocr import ocr_image_to_text_and_boxes


class MinerUAdapter(BaseAdapter):
    name = "mineru"

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        use_real = have_fitz() and getattr(doc, '__class__', None).__name__ != '_MockDoc'
        for i in range(pages):
            if use_real:
                page = doc[i]
                pm_text = page.get_text("text")
                pm_blocks = [tuple(b[:4]) for b in page.get_text("blocks")]
                img = render_page_image(doc, i, dpi=144)
                ocr_text, ocr_pix_boxes = ocr_image_to_text_and_boxes(img)
                pw, ph = page.rect.width, page.rect.height
                sx = pw / img.width if img.width else 1.0
                sy = ph / img.height if img.height else 1.0
                ocr_point_boxes = [(x0 * sx, y0 * sy, x1 * sx, y1 * sy) for (x0, y0, x1, y1) in ocr_pix_boxes]
                page_md = f"# Page {i+1} (MinerU)\n\n" + (pm_text or "")
                if ocr_text.strip():
                    page_md += "\n\n[OCR]\n\n" + ocr_text
                blocks[i] = pm_blocks + ocr_point_boxes
            else:
                img = render_page_image(doc, i, dpi=144)
                page_md = f"# Page {i+1} (MinerU) - Fallback Mode\n\nPyMuPDF not available. Placeholder text."
                blocks[i] = []
            md_parts.append(page_md)
        return "\n\n".join(md_parts), blocks
