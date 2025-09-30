import React from 'react';

export const metadata = {
  title: 'Documentation'
};

export default function DocumentationPage() {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <h1>Documentation</h1>
      <p>This page explains how to use the PDF Extraction Playground.</p>

      <h2>Overview</h2>
      <p>The app lets you upload a PDF and run multiple extraction models (Surya, Docling, Mineru) in parallel. You can compare their outputs side-by-side including timing, structural element counts, OCR boxes, word/character counts, and confidence (when available).</p>

      <h2>Getting Started</h2>
      <ol>
        <li>Open the <strong>Scan PDF</strong> page (default landing page).</li>
        <li>Drag & drop a PDF (or click the dropzone to choose one).</li>
        <li>Select which models you want to run (all are enabled by default).</li>
        <li>Click <em>Extract All Pages</em> to process the entire document.</li>
        <li>Review the extracted markdown text and annotated page images.</li>
      </ol>

      <h2>Model Comparison</h2>
      <p>Enable the <em>Side-by-side comparison</em> toggle to display each selected model in its own column. A metrics header summarizes performance and structural differences.</p>

      <h3>Metrics Explained</h3>
      <ul>
        <li><strong>Time (ms)</strong>: End-to-end extraction time.</li>
        <li><strong>Blocks</strong>: High-level grouped content blocks.</li>
        <li><strong>OCR Boxes</strong>: Number of OCR bounding boxes (if produced).</li>
        <li><strong>Chars / Words</strong>: Character and word counts of the markdown output.</li>
        <li><strong>Elements</strong>: Breakdown (titles, headers, paragraphs, tables, figures).</li>
        <li><strong>Confidence</strong>: Approximate model or fallback confidence. Lower values may indicate degraded or fallback mode.</li>
      </ul>

      <h2>Fallback Mode</h2>
      <p>On platforms missing native PDF rendering dependencies (e.g. PyMuPDF on some Windows setups), the backend enters a <strong>fallback mode</strong>. In this mode:</p>
      <ul>
        <li>Simplified placeholder page images are generated.</li>
        <li>Text may be limited or approximated.</li>
        <li>Confidence values are reduced to signal degraded output.</li>
      </ul>
      <p>Check the <code>/health</code> endpoint (or backend logs) if results look incomplete.</p>

      <h2>Theme & Layout</h2>
      <p>Use the theme toggle (sun/moon icon) to switch between light and dark modes. The layout is mobile-friendly—open the sidebar via the menu button on small screens.</p>

      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Upload Fails</strong>: Ensure the backend URL is correct via <code>NEXT_PUBLIC_BACKEND_URL</code>.</li>
        <li><strong>Slow Extraction</strong>: Large PDFs or OCR-heavy pages can increase processing time. Try fewer models.</li>
        <li><strong>No Text</strong>: Fallback mode may be active; review backend troubleshooting guide.</li>
      </ul>

      <h2>Environment Variables</h2>
      <ul>
        <li><code>NEXT_PUBLIC_BACKEND_URL</code>: Points frontend to the FastAPI backend (default: http://localhost:8000).</li>
      </ul>

      <h2>API Endpoint</h2>
      <pre>
POST /api/extract
Content-Type: multipart/form-data
Fields:
  file   - PDF file
  models - comma-separated list: surya,docling,mineru
      </pre>

      <h2>Planned Enhancements</h2>
      <ul>
        <li>Export combined comparison report.</li>
        <li>Selective page range extraction (currently always full PDF, per design choice).</li>
        <li>Advanced diff visualization for text changes.</li>
      </ul>

      <h2>Support</h2>
      <p>Open an issue or consult the backend <code>BACKEND_TROUBLESHOOTING.md</code> for platform-specific fixes.</p>
    </div>
  );
}
