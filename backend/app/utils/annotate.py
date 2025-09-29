from __future__ import annotations
from typing import Iterable, Tuple
from PIL import Image, ImageDraw

Rect = Tuple[float, float, float, float]


def annotate_blocks(img: Image.Image, blocks: Iterable[Rect], page_size_points: Tuple[float, float]) -> Image.Image:
    """
    Draw rectangles on an image corresponding to block coordinates in PDF point space.

    Args:
        img: PIL Image of the rendered PDF page (already scaled)
        blocks: list of (x0, y0, x1, y1) in PDF point coordinates
        page_size_points: (page_width_points, page_height_points)
    """
    annotated = img.copy()
    draw = ImageDraw.Draw(annotated)
    pw, ph = page_size_points
    sx = annotated.width / pw if pw else 1.0
    sy = annotated.height / ph if ph else 1.0

    for (x0, y0, x1, y1) in blocks:
        draw.rectangle([(x0 * sx, y0 * sy), (x1 * sx, y1 * sy)], outline=(220, 38, 38), width=2)

    return annotated
