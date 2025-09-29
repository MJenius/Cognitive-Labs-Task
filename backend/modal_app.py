import modal

# Build the image from requirements
image = (
    modal.Image.debian_slim()
    .pip_install_from_requirements("requirements.txt")
)

stub = modal.Stub(
    name="pdf-extraction-playground-backend",
    image=image,
)


@stub.function()
@modal.asgi_app()
def fastapi_app():
    # Import lazily so it happens inside the container
    from app.main import create_app

    return create_app()
