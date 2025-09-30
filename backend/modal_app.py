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
    )
    .pip_install_from_requirements("requirements.txt")
    # Pre-warm imports to reduce cold start time (before adding local files)
    .run_commands([
        "python -c 'import fitz; import pytesseract; import PIL; print(\"Dependencies preloaded\")'",
    ])
    # Add local files last to avoid rebuilding on code changes
    .add_local_dir("app", remote_path="/root/app")
)

# Changed from modal.Stub to modal.App
app = modal.App(
    name="pdf-extraction-playground-backend",
    image=image,
)


# Separate function for heavy PDF processing
@app.function(
    cpu=4.0,
    memory=4096,
    timeout=600,
    volumes={"/cache": volume},  # Mount cache volume
    # Don't keep warm for processing functions to save costs
)
def process_pdf_heavy(pdf_bytes: bytes, adapter_name: str):
    """Heavy PDF processing function with more resources"""
    from app.main import create_app
    app_instance = create_app()
    # This would be called for intensive processing
    # Implementation depends on your specific needs
    return {"status": "processed", "adapter": adapter_name}


@app.function(
    # Keep container warm to avoid cold starts (updated parameter name)
    min_containers=1,
    # Allocate moderate resources for API handling
    cpu=2.0,
    memory=2048,
    # Increase timeout for large PDF processing
    timeout=300,
    # Allow concurrent requests (updated parameter name)
    max_containers=10,
)
@modal.asgi_app()
def fastapi_app():
    # Import lazily so it happens inside the container
    from app.main import create_app

    return create_app()