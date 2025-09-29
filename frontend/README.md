# PDF Extraction Playground - Frontend (Next.js on Vercel)

A simple UI to upload a PDF, choose models (Surya, Docling, MinerU), and view both annotated images and extracted markdown in dual-pane or side-by-side comparison modes.

## Setup

1. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_BACKEND_URL` to your backend (Modal) URL.
2. Install dependencies and run dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

## Deploy to Vercel

1. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
2. Import the repo in Vercel and set Environment Variable `NEXT_PUBLIC_BACKEND_URL` to your Modal backend URL (no trailing slash).
3. Deploy.

## Notes

- The backend must have CORS enabled for your Vercel domain.
- Annotated images are returned as data URLs for simplicity.
