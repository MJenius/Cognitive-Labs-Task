# PDF Extraction Playground - Backend (FastAPI on Modal)

This is a FastAPI backend designed to run on [Modal](https://modal.com). It accepts PDF uploads, lets clients select from three "models" (Surya, Docling, MinerU), and returns extracted markdown plus annotated page images.

Note: The current adapters are lightweight placeholders using PyMuPDF text extraction and layout blocks. You can replace each adapter with real integrations when you add their dependencies.

## Endpoints

- POST `/api/extract` (multipart/form-data)
  - fields:
    - `file`: the PDF file
    - `models`: comma-separated list of models, e.g. `surya,docling,mineru`
    - `max_pages`: optional integer limit (default 5)
  - returns: `{ pages, models: { [model]: { text_markdown, annotated_images[] }}}`

## Local development

1. Create and activate a Python environment.
2. Install deps:

   ```bash
   pip install -r requirements.txt
   ```

3. Run locally with Uvicorn:

   ```bash
   uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
   ```

4. Set CORS origins (optional): copy `.env.example` to `.env` and set `CORS_ORIGINS`.

## Deploy to Modal

1. Install Modal CLI and log in:

   ```bash
   pip install modal-client
   modal token new
   ```

2. Deploy the ASGI app:

   ```bash
   modal deploy modal_app.py
   ```

3. Modal will output a URL for the deployed web app. Use that as `NEXT_PUBLIC_BACKEND_URL` in the frontend.

## Extending Adapters

Replace the placeholder logic in `app/adapters/*.py` with calls to the real libraries:
- Surya
- Docling
- MinerU

Each adapter should return `(markdown_text, blocks_by_page)` where `blocks_by_page[page_index]` is a list of `(x0,y0,x1,y1)` rectangles in PDF point coordinates.
