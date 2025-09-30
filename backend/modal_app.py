import modal

# Add persistent storage for caching
volume = modal.Volume.from_name("pdf-cache", create_if_missing=True)

# Build the image from requirements and add the app code
image = (
    modal.Image.debian_slim()
    .apt_install(
        "tesseract-ocr", 
        "libtesseract-dev",
        "poppler-utils",  # For faster PDF processing
        "libmagic1",      # For file type detection
        "git",            # Required for some model installations
        "wget",           # For downloading model weights
        "unzip",          # For extracting model archives
        "libreoffice",    # For document conversion (Docling)
        "pandoc",         # For enhanced document processing
    )
    .pip_install_from_requirements("requirements.txt")
    # Pre-warm imports to reduce cold start time (before adding local files)
    .run_commands([
        "python -c 'import fitz; import pytesseract; import PIL; print(\"Basic dependencies preloaded\")'",
        # Try to import the new models, but don't fail if they're not available
        "python -c 'try: import surya; print(\"Surya available\"); except: print(\"Surya fallback mode\")'",
        "python -c 'try: import docling; print(\"Docling available\"); except: print(\"Docling fallback mode\")'",
        "python -c 'try: import magic_pdf; print(\"MinerU available\"); except: print(\"MinerU fallback mode\")'",
    ])
    # Add local files last to avoid rebuilding on code changes
    .add_local_dir("app", remote_path="/root/app")
)

# Changed from modal.Stub to modal.App
app = modal.App(
    name="pdf-extraction-playground-backend",
    image=image,
)


# Separate function for heavy PDF processing with real models
@app.function(
    cpu=8.0,  # Increased for ML models
    memory=8192,  # Increased for model loading
    timeout=900,  # Increased timeout for model inference
    volumes={"/cache": volume},  # Mount cache volume
    gpu="any",  # Add GPU support for faster model inference (optional)
    # Don't keep warm for processing functions to save costs
)
def process_pdf_with_models(pdf_bytes: bytes, adapter_name: str, max_pages: int = None):
    """Heavy PDF processing function with real ML models"""
    from app.adapters.surya import SuryaAdapter
    from app.adapters.docling import DoclingAdapter
    from app.adapters.mineru import MinerUAdapter
    from app.utils.pdf import load_pdf_doc
    
    # Load the appropriate adapter
    adapters = {
        "surya": SuryaAdapter,
        "docling": DoclingAdapter, 
        "mineru": MinerUAdapter
    }
    
    if adapter_name not in adapters:
        return {"error": f"Unknown adapter: {adapter_name}"}
    
    try:
        # Load PDF and process
        doc = load_pdf_doc(pdf_bytes)
        adapter = adapters[adapter_name]()
        result = adapter.extract(doc, max_pages=max_pages)
        
        return {
            "status": "success",
            "adapter": adapter_name,
            "text": result[0],
            "blocks": result[1],
            "pages": len(result[1])
        }
    except Exception as e:
        return {
            "status": "error", 
            "adapter": adapter_name,
            "error": str(e)
        }


@app.function(
    # Keep container warm to avoid cold starts (updated parameter name)
    min_containers=1,
    # Allocate resources for API handling with model fallbacks
    cpu=4.0,  # Increased for fallback processing
    memory=4096,  # Increased for larger documents
    # Increase timeout for model processing
    timeout=600,
    # Allow concurrent requests (updated parameter name)
    max_containers=15,  # Increased for better concurrency
    volumes={"/cache": volume},  # Mount cache volume for all containers
)
@modal.asgi_app()
def fastapi_app():
    # Import lazily so it happens inside the container
    from app.main import create_app

    return create_app()