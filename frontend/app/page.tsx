"use client";

import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import Sidebar from "../components/Sidebar";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const ALL_MODELS = ["surya", "docling", "mineru"] as const;
type ModelKey = typeof ALL_MODELS[number];

interface ModelOutput {
  text_markdown: string;
  annotated_images: string[]; // data URLs
}

interface ExtractResponse {
  pages: number;
  models: Record<string, ModelOutput>;
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<ModelKey[]>([...ALL_MODELS]);
  const [primary, setPrimary] = useState<ModelKey>("surya");
  const [maxPages, setMaxPages] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [compare, setCompare] = useState<boolean>(false);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setResult(null);
      setError(null);
    } else if (f) {
      setError("Please drop a PDF file (.pdf)");
    }
  }, []);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setResult(null);
      setError(null);
    } else if (f) {
      setError("Please choose a PDF file (.pdf)");
    }
  }, []);

  const toggleModel = (m: ModelKey) => {
    setSelected((prev) => {
      const set = new Set(prev);
      if (set.has(m)) set.delete(m);
      else set.add(m);
      const arr = Array.from(set) as ModelKey[];
      if (!arr.includes(primary) && arr.length > 0) setPrimary(arr[0]);
      return arr;
    });
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("models", selected.join(","));
      form.append("max_pages", String(maxPages));
      const res = await fetch(`${BACKEND_URL}/api/extract`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: ExtractResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const selectedModels = useMemo(() => selected.filter((m) => ALL_MODELS.includes(m)), [selected]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4">
        <header className="mb-4 border-b border-gray-800 pb-3">
          <h1 className="text-lg font-semibold text-gray-200">Dashboard / Extraction</h1>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* Left: Upload dropzone */}
          <div
            className={clsx(
              "relative flex h-72 cursor-pointer items-center justify-center rounded-lg border border-dashed",
              isDragging ? "border-blue-500 bg-blue-950/40" : "border-gray-700 bg-gray-900/50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800/80 text-gray-300">⬆</div>
              <p className="font-medium text-gray-200">Drag and drop files here, or click to upload</p>
              <p className="text-xs text-gray-400">Allowed files: PDF</p>
            </div>
            <input id="file-input" type="file" accept="application/pdf" className="hidden" onChange={onSelectFile} />
          </div>

          {/* Right: Empty state & controls */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            {!result ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="text-4xl">📄</div>
                <div className="text-sm text-gray-400">No content extracted yet</div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
                    onClick={() => setCompare(false)}
                  >
                    Configure Processing Settings
                  </button>
                  <button
                    className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
                    onClick={() => setCompare(true)}
                  >
                    Schema Editor
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-300">Processed {result.pages} page(s).</div>
            )}

            {/* Controls */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-gray-400">Models</div>
                <div className="flex flex-col gap-1">
                  {ALL_MODELS.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-gray-200">
                      <input type="checkbox" className="h-4 w-4" checked={selectedModels.includes(m)} onChange={() => toggleModel(m)} />
                      <span className="capitalize">{m}</span>
                      {!compare && (
                        <input
                          type="radio"
                          name="primary"
                          className="ml-auto h-4 w-4"
                          checked={primary === m}
                          onChange={() => setPrimary(m)}
                          title="Set as primary for dual-pane view"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-gray-400">Options</div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-200">Side-by-side comparison</span>
                  <input type="checkbox" className="ml-auto h-4 w-4" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-200">Max pages</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="w-24 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-100"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  />
                </label>
                <button
                  className="mt-2 w-full rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                  onClick={submit}
                  disabled={!file || selectedModels.length === 0 || loading}
                >
                  {loading ? "Processing..." : "Extract All"}
                </button>
                {error && <div className="mt-2 rounded bg-red-900/40 p-2 text-sm text-red-300">{error}</div>}
                {file && <div className="mt-1 text-xs text-gray-400">Selected: {file.name}</div>}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        {result && (
          <section className="mt-6 space-y-4">
            {!compare ? (
              <DualPane model={primary} data={result.models[primary]} />
            ) : (
              <ComparisonGrid selected={selectedModels} data={result.models} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function DualPane({ model, data }: { model: ModelKey; data: ModelOutput }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-2">
        <h3 className="px-2 py-1 text-sm font-semibold capitalize text-gray-300">{model} • Annotated PDF</h3>
        <div className="max-h-[70vh] overflow-auto">
          {data.annotated_images.map((src, idx) => (
            <img key={idx} src={src} alt={`Page ${idx + 1}`} className="mx-auto mb-2 w-full max-w-3xl" />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-2">
        <h3 className="px-2 py-1 text-sm font-semibold capitalize text-gray-300">{model} • Extracted Markdown</h3>
        <div className="prose prose-invert max-h-[70vh] overflow-auto px-2">
          <ReactMarkdown>{data.text_markdown || "(no text)"}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ComparisonGrid({ selected, data }: { selected: ModelKey[]; data: Record<string, ModelOutput> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {selected.map((m) => (
        <div key={m} className="rounded-lg border border-gray-800 bg-gray-900/50 p-2">
          <h3 className="px-2 py-1 text-sm font-semibold capitalize text-gray-300">{m}</h3>
          <div className="max-h-[60vh] overflow-auto">
            {data[m]?.annotated_images?.map((src, idx) => (
              <img key={idx} src={src} alt={`${m} page ${idx + 1}`} className="mx-auto mb-2 w-full max-w-3xl" />
            ))}
          </div>
          <div className="prose prose-invert max-h-[40vh] overflow-auto px-2">
            <ReactMarkdown>{data[m]?.text_markdown || "(no text)"}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
