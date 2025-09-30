from __future__ import annotations
from typing import Dict, List, Tuple
import logging
import tempfile
import os
import json
try:
    import fitz  # type: ignore
except Exception:
    fitz = None  # type: ignore

# Real MinerU imports
try:
    from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader  # type: ignore[reportMissingImports]
    from magic_pdf.config.make_content_config import DropMode, MakeContentConfig  # type: ignore[reportMissingImports]
    from magic_pdf.pipe.UNIPipe import UNIPipe  # type: ignore[reportMissingImports]
    from magic_pdf.pipe.OCRPipe import OCRPipe  # type: ignore[reportMissingImports]
    from magic_pdf.pipe.TXTPipe import TXTPipe  # type: ignore[reportMissingImports]
    _HAVE_MINERU = True
except ImportError as e:
    logging.warning(f"MinerU not available: {e}. Falling back to PyMuPDF.")
    _HAVE_MINERU = False

from .base import BaseAdapter, BlocksByPage
from ..utils.pdf import render_page_image, have_fitz
from ..utils.ocr import ocr_image_to_text_and_boxes


class MinerUAdapter(BaseAdapter):
    name = "mineru"
    
    def __init__(self):
        self.pipe = None
        
    def _get_pipe(self):
        """Lazy load MinerU pipe when needed"""
        if not _HAVE_MINERU:
            return None
            
        if self.pipe is None:
            try:
                # Initialize UNIPipe for comprehensive PDF processing
                self.pipe = UNIPipe()
            except Exception as e:
                logging.error(f"Failed to initialize MinerU pipe: {e}")
                return None
        return self.pipe

    def extract(self, doc, max_pages: int = None) -> Tuple[str, BlocksByPage]:
        pages = len(doc) if max_pages is None else min(len(doc), max_pages)
        md_parts: List[str] = []
        blocks: BlocksByPage = {}
        
        # Try to use real MinerU if available
        pipe = self._get_pipe()
        if pipe is not None:
            return self._extract_with_mineru(doc, pages, md_parts, blocks, pipe)
        else:
            # Fallback to PyMuPDF-based extraction
            return self._extract_fallback(doc, pages, md_parts, blocks)
    
    def _extract_with_mineru(self, doc, pages: int, md_parts: List[str], blocks: BlocksByPage, pipe) -> Tuple[str, BlocksByPage]:
        """Extract using real MinerU pipe"""
        try:
            # Create temporary directories for MinerU processing
            with tempfile.TemporaryDirectory() as temp_dir:
                # Save PyMuPDF document to temporary file
                input_path = os.path.join(temp_dir, "input.pdf")
                output_dir = os.path.join(temp_dir, "output")
                os.makedirs(output_dir, exist_ok=True)
                
                # Save the document
                doc.save(input_path)
                
                # Set up data reader/writer
                data_reader = FileBasedDataReader("")
                data_writer = FileBasedDataWriter(output_dir)
                
                # Configure processing options
                config = MakeContentConfig(
                    drop_mode=DropMode.NONE,  # Keep all content
                )
                
                # Process the PDF with MinerU
                result = pipe.pdf_parse_main(
                    pdf_path=input_path,
                    parse_method="auto",  # Let MinerU choose the best method
                    output_dir=output_dir,
                    debug_mode=False
                )
                
                if result:
                    # Parse the results
                    for i in range(pages):
                        page_blocks = []
                        page_text = ""
                        
                        # Look for page-specific output
                        page_file = os.path.join(output_dir, f"page_{i+1}.json")
                        markdown_file = os.path.join(output_dir, f"page_{i+1}.md")
                        
                        # Try to read structured data
                        if os.path.exists(page_file):
                            try:
                                with open(page_file, 'r', encoding='utf-8') as f:
                                    page_data = json.load(f)
                                    
                                # Extract bounding boxes and text
                                if 'elements' in page_data:
                                    for element in page_data['elements']:
                                        if 'bbox' in element:
                                            bbox = element['bbox']
                                            if len(bbox) >= 4:
                                                page_blocks.append((bbox[0], bbox[1], bbox[2], bbox[3]))
                                        if 'text' in element and element['text'].strip():
                                            page_text += element['text'] + "\n"
                            except Exception as e:
                                logging.warning(f"Failed to parse page {i+1} JSON: {e}")
                        
                        # Try to read markdown output
                        if not page_text and os.path.exists(markdown_file):
                            try:
                                with open(markdown_file, 'r', encoding='utf-8') as f:
                                    page_text = f.read()
                            except Exception as e:
                                logging.warning(f"Failed to read page {i+1} markdown: {e}")
                        
                        # Fallback to looking for general output files
                        if not page_text:
                            # Look for any markdown or text files in output directory
                            for filename in os.listdir(output_dir):
                                if filename.endswith('.md') or filename.endswith('.txt'):
                                    try:
                                        with open(os.path.join(output_dir, filename), 'r', encoding='utf-8') as f:
                                            content = f.read()
                                            # Split content by pages if it's all in one file
                                            lines = content.split('\n')
                                            if pages > 1:
                                                page_start = i * (len(lines) // pages)
                                                page_end = (i + 1) * (len(lines) // pages)
                                                page_text = '\n'.join(lines[page_start:page_end])
                                            else:
                                                page_text = content
                                            break
                                    except Exception as e:
                                        logging.warning(f"Failed to read {filename}: {e}")
                        
                        # Format page content
                        page_md = f"# Page {i+1} (MinerU Real)\n\n"
                        if page_text.strip():
                            page_md += page_text.strip()
                        else:
                            page_md += "*No text detected*"
                        
                        blocks[i] = page_blocks
                        md_parts.append(page_md)
                    
                    return "\n\n".join(md_parts), blocks
                
        except Exception as e:
            logging.error(f"MinerU extraction failed: {e}")
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
                page_md = f"# Page {i+1} (MinerU Fallback)\n\n" + (pm_text or "")
                if ocr_text.strip():
                    page_md += "\n\n[OCR]\n\n" + ocr_text
                blocks[i] = pm_blocks + ocr_point_boxes
            else:
                img = render_page_image(doc, i, dpi=144)
                page_md = f"# Page {i+1} (MinerU Fallback)\n\nPyMuPDF not available. Placeholder text."
                blocks[i] = []
            md_parts.append(page_md)
        return "\n\n".join(md_parts), blocks
