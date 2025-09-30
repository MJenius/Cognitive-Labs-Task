from typing import Dict, List, Optional
from pydantic import BaseModel


class ModelMeta(BaseModel):
    time_ms: float
    block_count: int
    ocr_box_count: int
    char_count: int


class ModelOutput(BaseModel):
    text_markdown: str
    annotated_images: List[str]
    meta: Optional[ModelMeta] = None


class ExtractResponse(BaseModel):
    pages: int
    models: Dict[str, ModelOutput]
