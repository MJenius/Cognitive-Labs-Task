from __future__ import annotations
from typing import Dict, List, Tuple
import fitz

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image
from ..utils.ocr import ocr_image_to_text_and_boxes


class DoclingAdapter(BaseAdapter):
    name = "docling"

    def extract(self, doc: fitz.Document, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        # Placeholder implementation using PyMuPDF text + optional OCR overlay for images
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        for i in range(pages):
            page = doc[i]
            pm_text = page.get_text("text")
            pm_blocks = [tuple(b[:4]) for b in page.get_text("blocks")]

            img = render_page_image(doc, i, dpi=144)
            ocr_text, ocr_pix_boxes = ocr_image_to_text_and_boxes(img)
            pw, ph = page.rect.width, page.rect.height
            sx = pw / img.width if img.width else 1.0
            sy = ph / img.height if img.height else 1.0
            ocr_point_boxes = [(x0 * sx, y0 * sy, x1 * sx, y1 * sy) for (x0, y0, x1, y1) in ocr_pix_boxes]

            page_md = f"# Page {i+1} (Docling)\n\n" + (pm_text or "")
            if ocr_text.strip():
                page_md += "\n\n[OCR]\n\n" + ocr_text
            md_parts.append(page_md)
            blocks[i] = pm_blocks + ocr_point_boxes
        return "\n\n".join(md_parts), blocks
