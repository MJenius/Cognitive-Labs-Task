#!/usr/bin/env python3
"""Test script to validate the updated adapters with the sample PDF."""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.adapters.surya import SuryaAdapter
from app.adapters.docling import DoclingAdapter
from app.adapters.mineru import MinerUAdapter
from app.utils.pdf import load_pdf_doc

def test_adapter_with_pdf(adapter_class, name, pdf_path):
    """Test an adapter with a real PDF file."""
    print(f"\n=== Testing {name} Adapter with PDF ===")
    try:
        adapter = adapter_class()
        print(f"✓ {name} adapter created successfully")
        
        # Load the PDF
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        doc = load_pdf_doc(pdf_bytes)
        print(f"✓ PDF loaded successfully ({len(doc)} pages)")
        
        # Test extraction
        result = adapter.extract(doc, max_pages=1)
        
        if isinstance(result, tuple) and len(result) == 2:
            text, blocks = result
            print(f"✓ {name} extraction returned proper format")
            print(f"  Text length: {len(text)} characters")
            print(f"  Blocks: {len(blocks)} pages")
            
            # Show a snippet of the text
            text_snippet = text[:200] + "..." if len(text) > 200 else text
            print(f"  Text snippet: {repr(text_snippet)}")
            
            if "Fallback" in text:
                print(f"  ✓ Using fallback mode as expected (models not available)")
            elif "Real" in text:
                print(f"  ✓ Using real model implementation")
            else:
                print(f"  ✓ Extraction completed")
                
            return True
        else:
            print(f"✗ {name} extraction returned invalid format")
            return False
            
    except Exception as e:
        print(f"✗ {name} adapter failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Test all adapters with the sample PDF."""
    print("Testing updated PDF extraction adapters with sample PDF...")
    
    # Check if sample PDF exists
    pdf_path = "../sample.pdf"
    if not os.path.exists(pdf_path):
        print(f"✗ Sample PDF not found at {pdf_path}")
        return False
    
    print(f"✓ Using sample PDF: {pdf_path}")
    
    results = {
        'Surya': test_adapter_with_pdf(SuryaAdapter, 'Surya', pdf_path),
        'Docling': test_adapter_with_pdf(DoclingAdapter, 'Docling', pdf_path),
        'MinerU': test_adapter_with_pdf(MinerUAdapter, 'MinerU', pdf_path)
    }
    
    print(f"\n=== Test Results ===")
    for name, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{name}: {status}")
    
    all_passed = all(results.values())
    print(f"\nOverall: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)