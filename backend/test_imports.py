#!/usr/bin/env python3
"""Test script to check if the new model libraries are available."""

def test_surya():
    try:
        import surya  # type: ignore[reportMissingImports]
        from surya import layout, ocr  # type: ignore[reportMissingImports]
        print("✓ Surya imported successfully")
        print(f"  Available modules: layout, ocr")
        return True
    except Exception as e:
        print(f"✗ Surya import failed: {e}")
        return False

def test_docling():
    try:
        from docling.document_converter import DocumentConverter  # type: ignore[reportMissingImports]
        print("✓ Docling imported successfully")
        return True
    except Exception as e:
        print(f"✗ Docling import failed: {e}")
        return False

def test_mineru():
    try:
        import magic_pdf  # type: ignore[reportMissingImports]
        print("✓ MinerU (magic-pdf) imported successfully")
        return True
    except Exception as e:
        print(f"✗ MinerU import failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing model library imports...")
    print()
    
    surya_ok = test_surya()
    docling_ok = test_docling()
    mineru_ok = test_mineru()
    
    print()
    if all([surya_ok, docling_ok, mineru_ok]):
        print("✓ All model libraries ready!")
    else:
        print("✗ Some libraries need installation")