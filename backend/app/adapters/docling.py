from __future__ import annotations
from typing import Dict, List, Tuple
try:
    import fitz
except Exception:
    fitz = None

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import have_fitz


class DoclingAdapter(BaseAdapter):
    name = "docling"

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
                # Add minimal list formatting for differentiation
                formatted = text.replace('• ', '- ').replace('◦ ', '  - ')
                md_parts.append(f"# Page {i+1} (Docling)\n\n{formatted}\n\n")
            else:
                blocks[i] = []
                md_parts.append(f"# Page {i+1} (Docling)\n\nFallback.")
        
        return "\n\n".join(md_parts), blocks