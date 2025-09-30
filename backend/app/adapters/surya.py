from __future__ import annotations
from typing import Dict, List, Tuple
import logging
try:
    import fitz  # type: ignore
    _HAVE_FITZ = True
except Exception:
    fitz = None  # type: ignore
    _HAVE_FITZ = False

# Real Surya imports
try:
    from surya import detection, ocr, layout  # type: ignore[reportMissingImports]
    from surya.model.detection.model import load_model as load_detection_model  # type: ignore[reportMissingImports]
    from surya.model.recognition.model import load_model as load_recognition_model  # type: ignore[reportMissingImports]
    from surya.model.ordering.model import load_model as load_order_model  # type: ignore[reportMissingImports]
    from surya.model.segmentation.model import load_model as load_segmentation_model  # type: ignore[reportMissingImports]
    from surya.input.load import load_from_folder, load_from_file  # type: ignore[reportMissingImports]
    from surya.languages import CODE_TO_LANGUAGE  # type: ignore[reportMissingImports]
    from surya.input.processing import open_pdf, get_page_images  # type: ignore[reportMissingImports]
    _HAVE_SURYA = True
except ImportError as e:
    logging.warning(f"Surya not available: {e}. Falling back to PyMuPDF.")
    _HAVE_SURYA = False

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image, have_fitz
from ..utils.ocr import ocr_image_to_text_and_boxes


class SuryaAdapter(BaseAdapter):
    name = "surya"
    
    def __init__(self):
        self.detection_model = None
        self.recognition_model = None
        self.layout_model = None
        self.order_model = None
        
    def _load_models(self):
        """Lazy load Surya models when needed"""
        if not _HAVE_SURYA:
            return False
            
        try:
            if self.detection_model is None:
                self.detection_model = load_detection_model()
            if self.recognition_model is None:
                self.recognition_model = load_recognition_model()
            if self.layout_model is None:
                self.layout_model = load_segmentation_model()
            if self.order_model is None:
                self.order_model = load_order_model()
            return True
        except Exception as e:
            logging.error(f"Failed to load Surya models: {e}")
            return False

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        
        # Try to use real Surya if available
        if _HAVE_SURYA and self._load_models():
            return self._extract_with_surya(doc, pages, md_parts, blocks)
        else:
            # Fallback to PyMuPDF-based extraction
            return self._extract_fallback(doc, pages, md_parts, blocks)
    
    def _extract_with_surya(self, doc, pages: int, md_parts: List[str], blocks: BlocksByPage) -> Tuple[str, BlocksByPage]:
        """Extract using real Surya models"""
        try:
            # Get page images for Surya processing
            page_images = []
            for i in range(pages):
                img = render_page_image(doc, i, dpi=144)
                page_images.append(img)
            
            # Run Surya detection and OCR
            det_results = detection.batch_text_detection(page_images, self.detection_model)
            ocr_results = ocr.run_ocr(page_images, [["en"] for _ in page_images], det_results, self.recognition_model)
            
            # Process results for each page
            for i in range(pages):
                page_blocks = []
                page_text_parts = []
                
                # Get OCR results for this page
                if i < len(ocr_results):
                    ocr_result = ocr_results[i]
                    for text_line in ocr_result.text_lines:
                        # Extract bounding box coordinates
                        bbox = text_line.bbox
                        page_blocks.append((bbox[0], bbox[1], bbox[2], bbox[3]))
                        
                        # Extract text content
                        if hasattr(text_line, 'text') and text_line.text.strip():
                            page_text_parts.append(text_line.text.strip())
                
                # Format page content
                page_text = "\n".join(page_text_parts) if page_text_parts else ""
                page_md = f"# Page {i+1} (Surya Real)\n\n"
                if page_text:
                    page_md += page_text
                else:
                    page_md += "*No text detected*"
                
                blocks[i] = page_blocks
                md_parts.append(page_md)
                
            return "\n\n".join(md_parts), blocks
            
        except Exception as e:
            logging.error(f"Surya extraction failed: {e}")
            # Fall back to PyMuPDF extraction
            return self._extract_fallback(doc, pages, [], {})
    
    def _extract_fallback(self, doc, pages: int, md_parts: List[str], blocks: BlocksByPage) -> Tuple[str, BlocksByPage]:
        """Fallback extraction using PyMuPDF"""
        use_real = have_fitz() and getattr(doc, '__class__', None).__name__ != '_MockDoc'
        
        for i in range(pages):
            if use_real:
                page = doc[i]
                pm_text = page.get_text("text")
                pm_blocks = [tuple(b[:4]) for b in page.get_text("blocks")]
                img = render_page_image(doc, i, dpi=144)
                ocr_text, ocr_pix_boxes = ocr_image_to_text_and_boxes(img)
                pw, ph = page.rect.width, page.rect.height
                sx = pw / img.width if img.width else 1.0
                sy = ph / img.height if img.height else 1.0
                ocr_point_boxes = [(x0 * sx, y0 * sy, x1 * sx, y1 * sy) for (x0, y0, x1, y1) in ocr_pix_boxes]
                page_md = f"# Page {i+1} (Surya Fallback)\n\n" + (pm_text or "")
                if ocr_text.strip():
                    page_md += "\n\n[OCR]\n\n" + ocr_text
                blocks[i] = pm_blocks + ocr_point_boxes
            else:
                img = render_page_image(doc, i, dpi=144)
                page_md = f"# Page {i+1} (Surya Fallback)\n\nPyMuPDF not available. This is placeholder text."
                blocks[i] = []
            md_parts.append(page_md)
        return "\n\n".join(md_parts), blocks
