from __future__ import annotations
import fitz
from PIL import Image


def load_pdf_doc(pdf_bytes: bytes) -> fitz.Document:
    return fitz.open(stream=pdf_bytes, filetype="pdf")


def render_page_image(doc: fitz.Document, page_index: int, dpi: int = 144) -> Image.Image:
    page = doc[page_index]
    scale = dpi / 72.0
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    mode = "RGB" if pix.alpha == 0 else "RGBA"
    img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
    return img
