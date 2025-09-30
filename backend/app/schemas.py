from typing import Dict, List, Optional
from pydantic import BaseModel


class ElementCounts(BaseModel):
    titles: int = 0
    headers: int = 0
    paragraphs: int = 0
    tables: int = 0
    figures: int = 0


class ModelMeta(BaseModel):
    time_ms: float
    block_count: int
    ocr_box_count: int
    char_count: int
    word_count: int
    element_counts: ElementCounts
    confidence: Optional[float] = None


class ModelOutput(BaseModel):
    text_markdown: str
    annotated_images: List[str]
    meta: Optional[ModelMeta] = None


class ExtractResponse(BaseModel):
    pages: int
    models: Dict[str, ModelOutput]
