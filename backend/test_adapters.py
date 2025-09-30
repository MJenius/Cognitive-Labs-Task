#!/usr/bin/env python3
"""Test script to validate the updated adapters work correctly."""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.adapters.surya import SuryaAdapter
from app.adapters.docling import DoclingAdapter
from app.adapters.mineru import MinerUAdapter

def test_adapter(adapter_class, name):
    """Test an adapter with a mock document."""
    print(f"\n=== Testing {name} Adapter ===")
    try:
        adapter = adapter_class()
        print(f"✓ {name} adapter created successfully")
        
        # Create a mock document for testing
        class MockDoc:
            def __len__(self):
                return 1
            
            def __getitem__(self, index):
                return MockPage()
        
        class MockPage:
            def get_text(self, mode):
                return f"Sample text from page (mode: {mode})"
            
            def get_text_blocks(self):
                return [(10, 10, 100, 50, "Sample text", 0, 0)]
                
            @property
            def rect(self):
                return MockRect()
        
        class MockRect:
            width = 612
            height = 792
        
        # Test extraction
        mock_doc = MockDoc()
        result = adapter.extract(mock_doc, max_pages=1)
        
        if isinstance(result, tuple) and len(result) == 2:
            text, blocks = result
            print(f"✓ {name} extraction returned proper format")
            print(f"  Text length: {len(text)} characters")
            print(f"  Blocks: {len(blocks)} pages")
            if text and "Fallback" in text:
                print(f"  ✓ Using fallback mode as expected")
            elif text and "Real" in text:
                print(f"  ✓ Using real model implementation")
            return True
        else:
            print(f"✗ {name} extraction returned invalid format")
            return False
            
    except Exception as e:
        print(f"✗ {name} adapter failed: {e}")
        return False

def main():
    """Test all adapters."""
    print("Testing updated PDF extraction adapters...")
    
    results = {
        'Surya': test_adapter(SuryaAdapter, 'Surya'),
        'Docling': test_adapter(DoclingAdapter, 'Docling'),
        'MinerU': test_adapter(MinerUAdapter, 'MinerU')
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