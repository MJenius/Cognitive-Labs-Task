from __future__ import annotations
from typing import Dict, List, Tuple
try:
    import fitz
    _HAVE_FITZ = True
except Exception:
    fitz = None
    _HAVE_FITZ = False

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import have_fitz


class SuryaAdapter(BaseAdapter):
    name = "surya"

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        """Ultra-fast: minimal processing."""
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        use_real = have_fitz() and getattr(doc, '__class__', None).__name__ != '_MockDoc'
        
        for i in range(pages):
            if use_real:
                page = doc[i]
                text = page.get_text("text")
                blocks[i] = [tuple(b[:4]) for b in page.get_text("blocks")]
                md_parts.append(f"# Page {i+1} (Surya)\n\n{text}\n\n")
            else:
                blocks[i] = []
                md_parts.append(f"# Page {i+1} (Surya)\n\nFallback.")
        
        return "\n\n".join(md_parts), blocks