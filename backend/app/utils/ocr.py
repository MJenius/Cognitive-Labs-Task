from __future__ import annotations
from typing import Iterable, List, Tuple
from PIL import Image

Rect = Tuple[float, float, float, float]

try:
    import pytesseract  # type: ignore
    _HAVE_TESS = True
except Exception:
    pytesseract = None  # type: ignore
    _HAVE_TESS = False


def ocr_image_to_text_and_boxes(img: Image.Image) -> Tuple[str, List[Rect]]:
    """
    Runs OCR on a PIL image and returns (text, boxes in PIXEL coords).
    If Tesseract or pytesseract is unavailable, returns ("", []).
    """
    if not _HAVE_TESS:
        return "", []
    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)  # type: ignore[attr-defined]
    except Exception:
        return "", []

    n = len(data.get("level", []))
    words: List[str] = []
    boxes: List[Rect] = []
    for i in range(n):
        conf = data.get("conf", ["-1"])[i]
        try:
            conf_val = float(conf)
        except Exception:
            conf_val = -1.0
        if conf_val < 0:
            continue
        text = (data.get("text", [""])[i] or "").strip()
        if not text:
            continue
        x = int(data.get("left", [0])[i])
        y = int(data.get("top", [0])[i])
        w = int(data.get("width", [0])[i])
        h = int(data.get("height", [0])[i])
        words.append(text)
        boxes.append((float(x), float(y), float(x + w), float(y + h)))

    text_out = " ".join(words)
    return text_out, boxes