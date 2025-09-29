from typing import Dict, List
from pydantic import BaseModel


class ModelOutput(BaseModel):
    text_markdown: str
    annotated_images: List[str]


class ExtractResponse(BaseModel):
    pages: int
    models: Dict[str, ModelOutput]
