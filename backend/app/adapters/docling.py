from __future__ import annotations
from typing import Dict, List, Tuple
import logging
import tempfile
import os
try:
    import fitz  # type: ignore
except Exception:
    fitz = None  # type: ignore

# Real Docling imports
try:
    from docling.document_converter import DocumentConverter  # type: ignore[reportMissingImports]
    from docling.datamodel.base_models import InputFormat  # type: ignore[reportMissingImports]
    from docling.datamodel.pipeline_options import PdfPipelineOptions  # type: ignore[reportMissingImports]
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend  # type: ignore[reportMissingImports]
    _HAVE_DOCLING = True
except ImportError as e:
    logging.warning(f"Docling not available: {e}. Falling back to PyMuPDF.")
    _HAVE_DOCLING = False

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image, have_fitz
from ..utils.ocr import ocr_image_to_text_and_boxes


class DoclingAdapter(BaseAdapter):
    name = "docling"
    
    def __init__(self):
        self.converter = None
        
    def _get_converter(self):
        """Lazy load Docling converter when needed"""
        if not _HAVE_DOCLING:
            return None
            
        if self.converter is None:
            try:
                # Configure pipeline options for better extraction
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = True
                pipeline_options.do_table_structure = True
                
                # Initialize DocumentConverter with PDF backend
                self.converter = DocumentConverter(
                    allowed_formats=[InputFormat.PDF],
                    pdf_backend=PyPdfiumDocumentBackend,
                    pipeline_options=pipeline_options
                )
            except Exception as e:
                logging.error(f"Failed to initialize Docling converter: {e}")
                return None
        return self.converter

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        
        # Try to use real Docling if available
        converter = self._get_converter()
        if converter is not None:
            return self._extract_with_docling(doc, pages, md_parts, blocks, converter)
        else:
            # Fallback to PyMuPDF-based extraction
            return self._extract_fallback(doc, pages, md_parts, blocks)
    
    def _extract_with_docling(self, doc, pages: int, md_parts: List[str], blocks: BlocksByPage, converter) -> Tuple[str, BlocksByPage]:
        """Extract using real Docling converter"""
        try:
            # Save PyMuPDF document to temporary file for Docling processing
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_path = temp_file.name
                try:
                    # Save the document to temp file
                    doc.save(temp_path)
                    
                    # Convert with Docling
                    result = converter.convert(temp_path)
                    
                    # Process the result
                    if result.document:
                        # Extract structured content
                        full_text = result.document.export_to_markdown()
                        
                        # Extract page-level information
                        for i in range(min(pages, len(result.document.pages))):
                            page = result.document.pages[i]
                            page_blocks = []
                            
                            # Extract bounding boxes from page elements
                            for element in page.elements:
                                if hasattr(element, 'bbox') and element.bbox:
                                    bbox = element.bbox
                                    page_blocks.append((bbox.l, bbox.t, bbox.r, bbox.b))
                            
                            # Extract page text
                            page_text = ""
                            if hasattr(page, 'text') and page.text:
                                page_text = page.text
                            elif full_text:
                                # Approximate page content from full text
                                lines = full_text.split('\n')
                                page_start = i * (len(lines) // pages)
                                page_end = (i + 1) * (len(lines) // pages)
                                page_text = '\n'.join(lines[page_start:page_end])
                            
                            # Format page content
                            page_md = f"# Page {i+1} (Docling Real)\n\n"
                            if page_text.strip():
                                page_md += page_text.strip()
                            else:
                                page_md += "*No text detected*"
                            
                            blocks[i] = page_blocks
                            md_parts.append(page_md)
                        
                        # If we have remaining pages not covered by Docling
                        for i in range(len(result.document.pages), pages):
                            page_md = f"# Page {i+1} (Docling Real)\n\n*Page not processed*"
                            blocks[i] = []
                            md_parts.append(page_md)
                            
                        return "\n\n".join(md_parts), blocks
                    
                finally:
                    # Clean up temp file
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                        
        except Exception as e:
            logging.error(f"Docling extraction failed: {e}")
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
                page_md = f"# Page {i+1} (Docling Fallback)\n\n" + (pm_text or "")
                if ocr_text.strip():
                    page_md += "\n\n[OCR]\n\n" + ocr_text
                blocks[i] = pm_blocks + ocr_point_boxes
            else:
                img = render_page_image(doc, i, dpi=144)
                page_md = f"# Page {i+1} (Docling Fallback)\n\nPyMuPDF not available. Placeholder text."
                blocks[i] = []
            md_parts.append(page_md)
        return "\n\n".join(md_parts), blocks
