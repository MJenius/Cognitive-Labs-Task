import Link from 'next/link';

export const metadata = { title: 'Documentation' };

export default function DocumentationPage() {
  return (
    <div className="flex min-h-screen flex-col p-4 lg:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 border-b border-gray-200 pb-5 dark:border-gray-800">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Platform Documentation</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Everything you need to understand, use, and extend the PDF Extraction Playground.</p>
          <div className="mt-4">
            <Link href="/" className="inline-flex items-center rounded border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">← Back to Scan PDF</Link>
          </div>
        </header>

        <article className="space-y-12 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">1. User Guide</h2>
            <div className="space-y-4">
              <p>The platform allows you to upload a PDF and invoke multiple extraction backends in parallel for qualitative and quantitative comparison.</p>
              <ol className="ml-5 list-decimal space-y-1">
                <li>Open the <strong>Scan PDF</strong> (home) page.</li>
                <li>Drag &amp; drop or browse to select a PDF (full document is always processed).</li>
                <li>Select which models to include (Surya, Docling, Mineru).</li>
                <li>Click <em>Extract All Pages</em> and wait for processing.</li>
                <li>Toggle side‑by‑side comparison to view per‑model outputs and metrics.</li>
              </ol>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-900/60">
                <strong className="block text-gray-900 dark:text-gray-100">Tip:</strong>
                You can re-run extraction with a different model selection without reloading the page—just adjust the checkboxes and click extract again.
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">2. Technical Notes</h2>
            <p className="mb-2">Each model produces structured markdown plus annotated page images. Metrics help gauge structural fidelity and performance:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Time (ms)</strong>: Total extraction latency.</li>
              <li><strong>Blocks</strong>: Top-level logical content groupings.</li>
              <li><strong>OCR Boxes</strong>: Count of recognized text regions (if OCR engaged).</li>
              <li><strong>Chars / Words</strong>: Size indicators of produced markdown.</li>
              <li><strong>Elements</strong>: Breakdown (titles, headers, paragraphs, tables, figures).</li>
              <li><strong>Confidence</strong>: Lower values signal fallback or reduced certainty.</li>
            </ul>
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Fallback Mode</h3>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">If native PDF rendering libraries fail to load, a degraded pipeline generates placeholder images and approximate text; confidence values are intentionally lowered. Consult the backend health endpoint for diagnostic detail.</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">3. Documentation</h2>
            <ul className="ml-5 list-disc space-y-2">
              <li><strong>API documentation</strong> (auto-generated via FastAPI)</li>
              <li><strong>User guide</strong> explaining how to use the platform</li>
              <li><strong>Technical documentation</strong> covering model selection criteria and limitations</li>
            </ul>
            <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">The FastAPI interactive docs are available at <code>/docs</code> (Swagger UI) and <code>/redoc</code> (ReDoc) on the backend service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">4. Configuration & Environment</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><code>NEXT_PUBLIC_BACKEND_URL</code>: Frontend → backend base URL (default: http://localhost:8000)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">5. API Endpoint</h2>
            <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-100 p-4 text-[11px] leading-snug text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">POST /api/extract{`\n`}Content-Type: multipart/form-data{`\n`}Fields:{`\n`}  file   - PDF file{`\n`}  models - comma-separated list: surya,docling,mineru</pre>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">6. Troubleshooting</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Uploads fail</strong>: Verify backend is running & CORS not blocked.</li>
              <li><strong>Very slow</strong>: Large scans + OCR heavy pages—reduce models.</li>
              <li><strong>Empty output</strong>: Likely fallback mode—inspect backend <code>/health</code>.</li>
            </ul>
          </section>

          <section className="mb-20">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">7. Roadmap</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Exportable comparison reports.</li>
              <li>Advanced diff visualization.</li>
              <li>Optional page-range filtering.</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
