from __future__ import annotations
from typing import Dict, List, Tuple
try:
    import fitz  # type: ignore
except Exception:
    fitz = None  # type: ignore

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image, have_fitz


class DoclingAdapter(BaseAdapter):
    name = "docling"

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        """Fast extraction with list detection."""
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        use_real = have_fitz() and getattr(doc, '__class__', None).__name__ != '_MockDoc'
        
        for i in range(pages):
            if use_real:
                page = doc[i]
                text = page.get_text("text")
                raw_blocks = page.get_text("blocks")
                page_blocks = [tuple(b[:4]) for b in raw_blocks]
                
                page_md = f"# Page {i+1} (Docling)\n\n"
                if text.strip():
                    lines = [l.strip() for l in text.split('\n') if l.strip()]
                    for line in lines:
                        if line.startswith(('-', '•', '*')):
                            page_md += f"- {line[1:].strip()}\n"
                        else:
                            page_md += f"{line}\n\n"
                else:
                    page_md += "*[No content]*\n\n"
                
                blocks[i] = page_blocks
            else:
                page_md = f"# Page {i+1} (Docling) - Fallback\n\nPlaceholder."
                blocks[i] = []
            
            md_parts.append(page_md)
        
        return "\n\n".join(md_parts), blocks