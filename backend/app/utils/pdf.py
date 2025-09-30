from __future__ import annotations
from typing import Any, List
from PIL import Image, ImageDraw, ImageFont

try:  # Lazy / guarded import of PyMuPDF
    import fitz  # type: ignore
    _HAVE_FITZ = True
except Exception as e:  # broad: we specifically want to catch DLL load issues too
    fitz = None  # type: ignore
    _HAVE_FITZ = False
    _FITZ_IMPORT_ERROR = e
else:
    _FITZ_IMPORT_ERROR = None  # type: ignore


def have_fitz() -> bool:
    return _HAVE_FITZ


def load_pdf_doc(pdf_bytes: bytes):
    """Return a document-like object.

    If PyMuPDF is unavailable, return a small shim with only the attributes used
    elsewhere (len(doc), doc[i].rect.width/height). We approximate one blank page.
    """
    if _HAVE_FITZ:
        return fitz.open(stream=pdf_bytes, filetype="pdf")  # type: ignore

    class _MockPage:
        def __init__(self, index: int):
            self.rect = type("Rect", (), {"width": 595.0, "height": 842.0})()  # A4 size in points

    class _MockDoc(list):
        pass

    # naive page estimate: assume ~150KB per page if bigger than that, else 1 page
    est_pages = max(1, min(5, len(pdf_bytes) // 150_000 + 1))
    return _MockDoc(_MockPage(i) for i in range(est_pages))


def render_page_image(doc, page_index: int, dpi: int = 144) -> Image.Image:
    if _HAVE_FITZ:
        page = doc[page_index]
        scale = dpi / 72.0
        mat = fitz.Matrix(scale, scale)  # type: ignore
        pix = page.get_pixmap(matrix=mat, alpha=False)
        mode = "RGB" if pix.alpha == 0 else "RGBA"
        img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
        return img
    # Fallback: simple blank page placeholder with message
    width, height = 800, 1131  # approximate A4 @ ~96dpi
    img = Image.new("RGB", (width, height), (245, 245, 245))
    draw = ImageDraw.Draw(img)
    msg = "PyMuPDF not installed / DLL error. Using placeholder."
    draw.text((20, 20), msg, fill=(120, 120, 120))
    return img


def fitz_import_error() -> Exception | None:
    return _FITZ_IMPORT_ERROR
