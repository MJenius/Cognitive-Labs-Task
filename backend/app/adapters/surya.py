from __future__ import annotations
from typing import Dict, List, Tuple
try:
    import fitz  # type: ignore
    _HAVE_FITZ = True
except Exception:
    fitz = None  # type: ignore
    _HAVE_FITZ = False

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image, have_fitz


class SuryaAdapter(BaseAdapter):
    name = "surya"

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        """Fast extraction - no OCR, just text extraction."""
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
                
                page_md = f"# Page {i+1} (Surya)\n\n"
                if text.strip():
                    # Simple formatting
                    lines = [l.strip() for l in text.split('\n') if l.strip()]
                    for line in lines:
                        if len(line) > 50:
                            page_md += f"{line}\n\n"
                        else:
                            page_md += f"## {line}\n\n"
                else:
                    page_md += "*[No text detected]*\n\n"
                
                blocks[i] = page_blocks
            else:
                page_md = f"# Page {i+1} (Surya) - Fallback\n\nPlaceholder text."
                blocks[i] = []
            
            md_parts.append(page_md)
        
        return "\n\n".join(md_parts), blocks