# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Monorepo with two apps:
  - backend/ — FastAPI service (deployable on Modal) that accepts a PDF and returns per-model extracted markdown plus annotated page images.
  - frontend/ — Next.js 14 app (App Router) that uploads a PDF to the backend and renders side-by-side results.

Commands you’ll commonly use
Frontend (Next.js)
- Install deps:
  - npm install --prefix frontend
- Run dev server (http://localhost:3000):
  - npm run dev --prefix frontend
- Build:
  - npm run build --prefix frontend
- Start production server:
  - npm run start --prefix frontend
- Lint:
  - npm run lint --prefix frontend
- Environment:
  - Set NEXT_PUBLIC_BACKEND_URL (e.g., http://localhost:8000 or your Modal URL). For local dev, copy frontend/.env.local.example to frontend/.env.local and edit the value.

Backend (FastAPI + Uvicorn, optional Modal deploy)
- Create venv (example):
  - python -m venv .venv && . .venv/bin/activate  # bash
  - python -m venv .venv; .\.venv\\Scripts\\Activate.ps1  # PowerShell
- Install deps:
  - pip install -r backend/requirements.txt
- Run locally with reload:
  - uvicorn backend.app.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
- Quick health check:
  - curl http://localhost:8000/health
- Deploy to Modal (requires modal token configured):
  - pip install modal-client
  - modal deploy backend/modal_app.py

Testing
- No explicit test suites or test scripts are defined in this repo. Use the “Quick health check” and the curl example in Architecture > Data flow to validate end-to-end behavior.

High-level architecture and structure
Backend (FastAPI)
- Entry and composition:
  - backend/app/main.py defines create_app(), sets CORS from CORS_ORIGINS, exposes /health, and mounts the extract router at /api.
  - backend/modal_app.py defines the Modal image (requirements.txt) and exposes the FastAPI app via @modal.asgi_app().
- Extraction pipeline (POST /api/extract):
  - backend/app/routers/extract.py handles PDF upload (multipart/form-data), optional models list (surya, docling, mineru), and max_pages.
  - It loads the PDF bytes with utils.pdf.load_pdf_doc(), selects adapters via adapters.get_adapter(), and for each selected model calls adapter.extract().
  - adapter.extract() returns (markdown_text, blocks_by_page). The route then renders per-page images with utils.pdf.render_page_image(), overlays rectangles with utils.annotate.annotate_blocks(), encodes them as data URLs, and returns JSON: { pages, models: { [model]: { text_markdown, annotated_images[] } } }.
- Adapters (pluggable model strategy):
  - backend/app/adapters/{surya,docling,mineru}.py implement a common interface inherited from BaseAdapter. Current implementations use PyMuPDF to collect text and layout blocks; they are placeholders you can replace with real model integrations. adapters/__init__.py registers the adapters in ADAPTERS and exposes KNOWN_MODELS and get_adapter().
- Utilities:
  - utils/pdf.py provides PDF loading and rasterization to PIL images.
  - utils/annotate.py draws block rectangles onto the rendered page image with coordinate scaling from PDF points to pixels.

Frontend (Next.js 14, App Router)
- UI flow:
  - frontend/app/page.tsx implements the main client page. Users drag/drop or pick a PDF, choose models, set max pages, and click “Extract All”.
  - It POSTs to `${NEXT_PUBLIC_BACKEND_URL}/api/extract` with multipart form data and then renders results: annotated images and extracted markdown in either a dual-pane view (primary model) or a comparison grid across selected models.
  - Sidebar.tsx provides a static navigation scaffold; layout.tsx sets dark theme defaults and base styles; Tailwind is configured via tailwind.config.ts.
- Environment contract:
  - The frontend requires NEXT_PUBLIC_BACKEND_URL. Ensure the backend’s CORS_ORIGINS includes the frontend origin when running across hosts.

Data flow (end-to-end)
1) Browser sends multipart/form-data to backend /api/extract with fields: file (PDF), models (comma-separated), max_pages.
2) Backend builds per-model outputs by calling adapter.extract(), renders annotated images, and responds with JSON and image data URLs.
3) Frontend renders the returned markdown and images per model.

Example end-to-end request (local dev)
- Using curl (bash):
  - curl -X POST "http://localhost:8000/api/extract" -F "file=@/path/to/sample.pdf" -F "models=surya,docling,mineru" -F "max_pages=3"
- Using PowerShell:
  - $Form = @{ file = Get-Item "C:\\path\\to\\sample.pdf"; models = "surya,docling,mineru"; max_pages = 3 }
  - Invoke-RestMethod -Uri "http://localhost:8000/api/extract" -Method Post -Form $Form

Repo-specific notes
- Build artifacts and local env files are ignored via .gitignore (frontend/.next, __pycache__, frontend/.env.local, etc.). If you see tracked build outputs again, run: git rm -r --cached frontend/.next backend/app/**/__pycache__
- Frontend README and Backend README include additional setup and deployment notes (Vercel/Modal). Keep NEXT_PUBLIC_BACKEND_URL in sync with your deployed backend, and configure backend CORS to include the frontend origin.
