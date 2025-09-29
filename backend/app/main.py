import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.extract import router as extract_router


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
        return {"status": "ok"}

    app.include_router(extract_router, prefix="/api")

    return app
