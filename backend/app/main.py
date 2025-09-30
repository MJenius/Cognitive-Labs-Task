import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.extract import router as extract_router
from .utils.pdf import have_fitz, fitz_import_error


def create_app() -> FastAPI:
    app = FastAPI(title="PDF Extraction Playground", version="0.1.0")

    cors_origins = os.getenv("CORS_ORIGINS", "*")
    origins = [o.strip() for o in cors_origins.split(",") if o.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "pdf_engine": "fitz" if have_fitz() else "fallback",
            "fitz_available": have_fitz(),
            "fitz_error": str(fitz_import_error()) if not have_fitz() else None,
        }

    app.include_router(extract_router, prefix="/api")

    return app

# Expose a module-level `app` instance for `uvicorn app.main:app`
app = create_app()
