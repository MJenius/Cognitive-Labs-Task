from __future__ import annotations
from typing import Dict, List, Tuple
import fitz

from .base import BaseAdapter, BlocksByPage


class MinerUAdapter(BaseAdapter):
    name = "mineru"

    def extract(self, doc: fitz.Document, max_pages: int = 5) -> Tuple[str, BlocksByPage]:
        # Placeholder implementation using PyMuPDF text + blocks
        pages = min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        for i in range(pages):
            page = doc[i]
            md_parts.append(f"# Page {i+1} (MinerU)\n\n" + page.get_text("text"))
            blocks[i] = [tuple(b[:4]) for b in page.get_text("blocks")]
        return "\n\n".join(md_parts), blocks
