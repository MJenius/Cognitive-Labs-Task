# PDF Extraction Playground

[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/MJenius/Cognitive-Labs-Task)

This repository contains a full-stack application designed to upload PDF files, process them using various extraction models, and display the results for comparison. It's a monorepo consisting of a Next.js frontend and a FastAPI backend.

The application allows users to upload a PDF and compare the extraction results from three placeholder models: **Surya**, **Docling**, and **MinerU**. The UI displays the extracted markdown content alongside the original PDF pages annotated with bounding boxes for detected elements.

## Features

-   **Monorepo Architecture**: Clean separation of frontend and backend concerns.
-   **PDF Upload**: Drag-and-drop or file-picker interface for uploading PDF documents.
-   **Multi-Model Extraction**: Concurrently process PDFs with multiple extraction backends.
-   **Dual-Pane Viewer**: View a model's extracted markdown side-by-side with zoomable, annotated page images.
-   **Comparison View**: Compare results from all selected models in a grid layout, including a detailed metrics table.
-   **Pluggable Backend Adapters**: Easily extend the backend to support new extraction models.
-   **Deployable**: The backend is ready for deployment on [Modal](https://modal.com), and the frontend on [Vercel](https://vercel.com).
-   **Dark/Light Mode**: Themed UI for user preference.

## Architecture

The project is a monorepo with two main components: `frontend` and `backend`.

### Backend (FastAPI)

-   **Framework**: Built with FastAPI, providing a robust and fast API service.
-   **Entrypoint**: `backend/app/main.py` creates the FastAPI app, configures CORS, and mounts the API router.
-   **Deployment**: `backend/modal_app.py` contains the configuration for one-command deployment to the Modal serverless platform.
-   **Extraction Pipeline**: The `POST /api/extract` endpoint in `backend/app/routers/extract.py` handles file uploads. It utilizes an adapter pattern to call the selected extraction models.
-   **Adapters**: Models are integrated via a common `BaseAdapter` interface. Current implementations in `backend/app/adapters/` are placeholders using `PyMuPDF` for basic text and block extraction and `Pytesseract` for OCR. This is where real model libraries would be integrated.
-   **PDF Processing**: `PyMuPDF` is the core engine for PDF parsing and rendering. A fallback mode is implemented for environments where `PyMuPDF` fails (e.g., due to DLL issues), ensuring the application remains functional, albeit with placeholder data.
-   **Health Check**: A `/health` endpoint is available to check the status of the PDF processing engine.

### Frontend (Next.js)

-   **Framework**: Built with Next.js 14 (App Router), React, and styled with Tailwind CSS.
-   **UI Flow**: `frontend/app/page.tsx` implements the main user interface for file upload, model selection, and displaying results.
-   **State Management**: React state is used to manage file uploads, processing status, and API results.
-   **Result Display**:
    -   A dual-pane view shows one model's annotated images and markdown.
    -   A comparison grid provides a side-by-side view of all selected models, with a detailed metrics table summarizing performance and output characteristics.
-   **Environment**: The frontend requires the `NEXT_PUBLIC_BACKEND_URL` environment variable to connect to the backend API.

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

-   Node.js (v18.17 or later)
-   npm or yarn
-   Python (v3.10 or later) and `pip`

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a Python virtual environment:**
    ```bash
    # For macOS/Linux
    python3 -m venv .venv
    source .venv/bin/activate

    # For Windows (PowerShell)
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    ```

3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the FastAPI development server:**
    ```bash
    uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
    ```
    The backend API will be available at `http://localhost:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install the required Node.js packages:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Copy the example environment file and set the backend URL.
    ```bash
    cp .env.local.example .env.local
    ```
    Ensure `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` is set to `http://localhost:8000`.

4.  **Run the Next.js development server:**
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

## Deployment

### Backend on Modal

The backend is designed for easy deployment on Modal.

1.  **Install the Modal client:**
    ```bash
    pip install modal-client
    ```

2.  **Set up your Modal token:**
    ```bash
    modal token new
    ```

3.  **Deploy the application:**
    From the root of the repository, run:
    ```bash
    modal deploy backend/modal_app.py
    ```
    Modal will provide a public URL for your deployed backend.

### Frontend on Vercel

The frontend can be deployed to Vercel or any other static hosting provider.

1.  Push the repository to a Git provider (e.g., GitHub).
2.  Import the repository into your Vercel account.
3.  Set the **Root Directory** to `frontend`.
4.  Add an environment variable `NEXT_PUBLIC_BACKEND_URL` and set its value to the URL of your deployed Modal backend.
5.  Deploy.

**Note:** After deploying, ensure your backend's `CORS_ORIGINS` environment variable is updated to include your Vercel application's domain.

## API Endpoint

The primary API endpoint for extracting data from a PDF is:

-   **Endpoint**: `POST /api/extract`
-   **Content-Type**: `multipart/form-data`
-   **Form Fields**:
    -   `file`: The PDF file to process.
    -   `models` (string): A comma-separated list of models to use (e.g., `surya,docling,mineru`).
    -   `page_start` (optional, integer): The starting page number for extraction (1-indexed).
    -   `page_end` (optional, integer): The ending page number for extraction.

-   **Success Response**: A JSON object containing the number of pages processed and a dictionary of model outputs. Each model's output includes `text_markdown`, `annotated_images` (as data URLs), and metadata.

```json
{
  "pages": 1,
  "models": {
    "surya": {
      "text_markdown": "# Page 1 (Surya)...",
      "annotated_images": ["data:image/png;base64,..."],
      "meta": {
        "time_ms": 123.45,
        "block_count": 15,
        "ocr_box_count": 0,
        "char_count": 1200,
        "word_count": 200,
        "element_counts": {
          "titles": 1,
          "headers": 2,
          "paragraphs": 10,
          "tables": 1,
          "figures": 1
        },
        "confidence": 0.95
      }
    }
  }
}
```

## Troubleshooting

The backend relies on `PyMuPDF`, which can sometimes have installation issues, particularly with DLLs on Windows. A troubleshooting guide is available at `backend/BACKEND_TROUBLESHOOTING.md` to help resolve these problems. You can also check the `/health` endpoint on the backend to see if it has entered `fallback` mode.
