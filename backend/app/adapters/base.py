from __future__ import annotations
from typing import Dict, List, Tuple
import fitz  # PyMuPDF

Rect = Tuple[float, float, float, float]
BlocksByPage = Dict[int, List[Rect]]


class BaseAdapter:
    name: str = "base"

    def extract(self, doc: fitz.Document, max_pages: int = 5) -> Tuple[str, BlocksByPage]:
        """
        Extract text (as markdown string) and return layout blocks per page.

        Returns:
            text_markdown: str - the extracted text content in markdown format
            blocks_by_page: Dict[int, List[Rect]] - mapping page index -> list of block rects
        """
        raise NotImplementedError
