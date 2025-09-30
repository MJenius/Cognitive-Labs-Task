import modal

# Build the image from requirements and add the app code
image = (
    modal.Image.debian_slim()
    .apt_install("tesseract-ocr", "libtesseract-dev")  # For OCR support
    .pip_install_from_requirements("requirements.txt")
    .add_local_dir("app", remote_path="/root/app")  # Add the entire app directory
)

# Changed from modal.Stub to modal.App
app = modal.App(
    name="pdf-extraction-playground-backend",
    image=image,
)


@app.function()
@modal.asgi_app()
def fastapi_app():
    # Import lazily so it happens inside the container
    from app.main import create_app

    return create_app()