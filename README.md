# PDF Extraction Playground

A full-stack application designed to upload PDF files, process them using various extraction models, and display the results for comparison. It's a monorepo consisting of a Next.js frontend and a FastAPI backend.

The application allows users to upload PDFs and compare the extraction results from three models: **Surya**, **Docling**, and **MinerU**. The system attempts to use these specialized models for optimal extraction, with automatic fallback to PyMuPDF to ensure reliable functionality. The UI displays the extracted markdown content alongside the original PDF pages annotated with bounding boxes for detected elements.

## Features

- **Monorepo Architecture**: Clean separation of frontend and backend concerns.
- **PDF Upload**: Drag-and-drop or file-picker interface for uploading PDF documents.
- **Multi-Model Extraction**: Attempts to process PDFs with multiple extraction backends, falling back to PyMuPDF when needed.
- **Page Range Selection**: Extract specific page ranges from PDF documents.
- **Dual-Pane Viewer**: View a model's extracted markdown side-by-side with zoomable, annotated page images.
- **Comparison View**: Compare results from all selected models in a grid layout, including a detailed metrics table.
- **Zoomable Images**: Interactive PDF page viewing with zoom, pan, and pinch controls.
- **Dark/Light Mode**: Themed UI for user preference.
- **Robust Fallback**: PyMuPDF fallback ensures functionality even when specialized models are unavailable.
- **Deployable**: Ready for deployment on [Modal](https://modal.com) and [Vercel](https://vercel.com).

## Architecture

The project is a monorepo with two main components: `frontend` and `backend`.

### Backend (FastAPI)

- **Framework**: Built with FastAPI, providing a robust and fast API service.
- **Entrypoint**: `backend/app/main.py` creates the FastAPI app, configures CORS, and mounts the API router.
- **Deployment**: `backend/modal_app.py` contains the configuration for one-command deployment to Modal.
- **Extraction Pipeline**: The `POST /api/extract` endpoint in `backend/app/routers/extract.py` handles file uploads and utilizes an adapter pattern.
- **Model Adapters**: Three extraction models are integrated via a common `BaseAdapter` interface:
  - `SuryaAdapter` - Attempts specialized layout detection with PyMuPDF fallback
  - `DoclingAdapter` - Attempts enhanced text formatting with PyMuPDF fallback
  - `MinerUAdapter` - Attempts optimized fast processing with PyMuPDF fallback
- **PDF Processing**: PyMuPDF (`backend/app/utils/pdf.py`) is the core engine for PDF parsing and rendering with intelligent fallback modes.
- **Rate Limiting**: Built-in rate limiting (12 requests per minute per IP).
- **Health Monitoring**: `/health` endpoint reports PDF engine status and availability.

### Frontend (Next.js)

- **Framework**: Built with Next.js 14 (App Router), React, and styled with Tailwind CSS.
- **Main Interface**: `frontend/app/page.tsx` implements the complete user workflow.
- **State Management**: React state manages file uploads, processing status, and results.
- **Interactive Components**:
  - `Sidebar` - Navigation and file status
  - `ZoomableImage` - Interactive PDF page viewer with zoom controls
  - `ThemeToggle` - Dark/light mode switching
- **Responsive Design**: Mobile-friendly with `MobileSidebar` for smaller screens.
- **Results Display**:
  - Dual-pane view showing annotated images alongside extracted markdown
  - Comparison grid with detailed metrics and side-by-side model outputs
  - Performance analytics including processing time, element counts, and confidence scores

## Getting Started

### Prerequisites

- Node.js (v18.17 or later)
- npm or yarn
- Python (v3.10 or later) and `pip`

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment:**
   ```bash
   # For macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # For Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the development server:**
   ```bash
   uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
   ```
   The backend API will be available at `http://localhost:8000`.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` to `http://localhost:8000`.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

## Deployment

### Backend on Modal

1. **Install Modal CLI:**
   ```bash
   pip install modal
   ```

2. **Set up Modal token:**
   ```bash
   modal token new
   ```

3. **Deploy:**
   ```bash
   modal deploy backend/modal_app.py
   ```

### Frontend on Vercel

The project includes `vercel.json` for automatic configuration:

1. Push to GitHub/GitLab/Bitbucket
2. Import repository in Vercel
3. Set root directory to `frontend`
4. Deploy automatically with pre-configured environment variables

## API Reference

### Extract Endpoint

**`POST /api/extract`**

Upload and process a PDF file with selected models.

**Form Data:**
- `file` (required): PDF file to process
- `models` (optional): Comma-separated list of models (`surya,docling,mineru`)
- `page_start` (optional): Starting page number (1-indexed)
- `page_end` (optional): Ending page number

**Response:**
```json
{
  "pages": 3,
  "models": {
    "surya": {
      "text_markdown": "# Extracted content...",
      "annotated_images": ["data:image/png;base64,..."],
      "meta": {
        "time_ms": 1250.0,
        "block_count": 45,
        "ocr_box_count": 0,
        "char_count": 5420,
        "word_count": 892,
        "element_counts": {
          "titles": 3,
          "headers": 8,
          "paragraphs": 12,
          "tables": 2,
          "figures": 1
        },
        "confidence": 0.94
      }
    }
  }
}
```

### Health Check

**`GET /health`**

Check backend status and PDF engine availability.

```json
{
  "status": "ok",
  "pdf_engine": "fitz",
  "fitz_available": true,
  "fitz_error": null
}
```

## Troubleshooting

### PyMuPDF Issues

The backend uses PyMuPDF for PDF processing. If you encounter issues:

1. **Check engine status:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Common Windows fixes:**
   - Install Visual C++ Redistributable
   - Use 64-bit Python
   - Clear pip cache: `pip cache purge`

3. **Detailed troubleshooting:**
   See `backend/BACKEND_TROUBLESHOOTING.md`

### Fallback Mode

When specialized extraction models are unavailable, the system automatically uses PyMuPDF fallback:
- Provides reliable text extraction using PyMuPDF's core functionality
- Generates page images with basic element detection
- Maintains full API compatibility
- Sets confidence scores based on extraction quality

### Common Issues

- **CORS errors**: Ensure backend `CORS_ORIGINS` includes your frontend domain
- **File upload fails**: Check file size (max 15MB) and format (PDF only)
- **Slow processing**: Large files with many pages - try reducing page range

## Configuration

### Environment Variables

**Frontend:**
- `NEXT_PUBLIC_BACKEND_URL`: Backend API base URL

**Backend:**
- `CORS_ORIGINS`: Comma-separated list of allowed origins

### File Limits

- Maximum file size: 15MB
- Rate limit: 12 requests per minute per IP
- Supported format: PDF only

## Development

The project uses:
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Zoom Pan Pinch** for interactive image viewing
- **React Markdown** for content rendering
- **Pydantic** for API validation
- **FastAPI** for backend framework

## License

This project is open source and available under standard terms.