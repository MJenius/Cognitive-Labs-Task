"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import Sidebar from "../components/Sidebar";
import MobileSidebar from "../components/MobileSidebar";
import ThemeToggle from "../components/ThemeToggle";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const ALL_MODELS = ["surya", "docling", "mineru"] as const;
type ModelKey = typeof ALL_MODELS[number];

interface ElementCounts {
  titles: number;
  headers: number;
  paragraphs: number;
  tables: number;
  figures: number;
}

interface ModelMeta {
  time_ms: number;
  block_count: number;
  ocr_box_count: number;
  char_count: number;
  word_count: number;
  element_counts: ElementCounts;
  confidence?: number;
}

interface ModelOutput {
  text_markdown: string;
  annotated_images: string[]; // data URLs
  meta?: ModelMeta;
}

interface ExtractResponse {
  pages: number;
  models: Record<string, ModelOutput>;
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<ModelKey[]>([...ALL_MODELS]);
  const [primary, setPrimary] = useState<ModelKey>("surya");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [compare, setCompare] = useState<boolean>(false);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    const isPdf = !!f && (f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf"));
    if (f && isPdf) {
      setFile(f);
      setResult(null);
      setError(null);
    } else if (f) {
      setError("Please drop a PDF file (.pdf)");
    }
  }, []);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const isPdf = !!f && (f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf"));
    if (f && isPdf) {
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        currentFileName={file?.name ?? null}
        uploadStatus={loading ? "uploading" : result ? "done" : file ? "selected" : error ? "error" : "idle"}
      />
      
      <MobileSidebar
        currentFileName={file?.name ?? null}
        uploadStatus={loading ? "uploading" : result ? "done" : file ? "selected" : error ? "error" : "idle"}
      />
      
      {/* Mobile header with theme toggle */}
      <div className="border-b border-gray-200 bg-gray-50 p-4 pl-16 dark:border-gray-800 dark:bg-gray-900 lg:hidden lg:pl-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">PDF Extraction</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 lg:p-6">
        <header className="mb-4 hidden border-b border-gray-200 pb-3 dark:border-gray-800 lg:block">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Dashboard / Extraction</h1>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* Left: Upload dropzone */}
          <div
            className={clsx(
              "relative flex h-72 cursor-pointer items-center justify-center rounded-lg border border-dashed p-4 transition-colors",
              isDragging 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" 
                : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="w-full text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800/80 dark:text-gray-300">⬆</div>
              {!file ? (
                <>
                  <p className="font-medium text-gray-800 dark:text-gray-200">Drag and drop files here, or click to upload</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Allowed files: PDF</p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-2 inline-flex max-w-full items-center gap-2 truncate rounded border border-gray-300 bg-gray-200 px-2 py-1 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
                    <span className="inline-block max-w-[12rem] truncate sm:max-w-[16rem]" title={file.name}>{file.name}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">({Math.ceil(file.size/1024)} KB)</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Drag and drop / click to upload more files</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">New files will replace the current selection</p>
                </>
              )}
            </div>
            <input id="file-input" ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onSelectFile} />
          </div>

          {/* Right: Empty state & controls */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            {!result ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="text-4xl">📄</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">No content extracted yet</div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    className="rounded border border-gray-300 bg-gray-200 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setCompare(false)}
                  >
                    Configure Processing Settings
                  </button>
                  <button
                    className="rounded border border-gray-300 bg-gray-200 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setCompare(true)}
                  >
                    Schema Editor
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">Processed {result.pages} page(s).</div>
            )}

            {/* Controls */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Models</div>
                <div className="flex flex-col gap-1">
                  {ALL_MODELS.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600" 
                        checked={selectedModels.includes(m)} 
                        onChange={() => toggleModel(m)} 
                      />
                      <span className="capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Options</div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-800 dark:text-gray-200">Side-by-side comparison</span>
                  <input 
                    type="checkbox" 
                    className="ml-auto h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600" 
                    checked={compare} 
                    onChange={(e) => setCompare(e.target.checked)} 
                  />
                </label>
                <button
                  className="mt-2 w-full rounded bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-500 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                  onClick={submit}
                  disabled={!file || selectedModels.length === 0 || loading}
                >
                  {loading ? "Processing..." : "Extract All Pages"}
                </button>
                {error && <div className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300">{error}</div>}
                {file && <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Selected: {file.name}</div>}
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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-col gap-2 px-2 py-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-300">{model} • Annotated PDF</h3>
          {data.meta && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {data.meta.time_ms.toFixed(0)}ms • {data.meta.block_count} blocks • {data.meta.word_count || 0} words
            </div>
          )}
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {data.annotated_images.map((src, idx) => (
            <img key={idx} src={src} alt={`Page ${idx + 1}`} className="mx-auto mb-2 w-full max-w-3xl" />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-col gap-2 px-2 py-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-300">{model} • Extracted Markdown</h3>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-gray-300 bg-gray-200 px-2 py-1 text-xs text-gray-800 hover:bg-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => navigator.clipboard.writeText(data.text_markdown || "")}
            >
              Copy
            </button>
            <button
              className="rounded border border-gray-300 bg-gray-200 px-2 py-1 text-xs text-gray-800 hover:bg-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => {
                const blob = new Blob([data.text_markdown || ""], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${model}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </button>
          </div>
        </div>
        <div className="prose prose-gray dark:prose-invert max-h-[70vh] overflow-auto px-2">
          <ReactMarkdown>{data.text_markdown || "(no text)"}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ComparisonGrid({ selected, data }: { selected: ModelKey[]; data: Record<string, ModelOutput> }) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'images' | 'text'>('metrics');
  
  // Calculate differences between models
  const getModelDifferences = () => {
    if (selected.length < 2) return {};
    
    const differences: Record<string, any> = {};
    selected.forEach(model => {
      const modelData = data[model];
      if (!modelData?.meta) return;
      
      differences[model] = {
        time_ms: modelData.meta.time_ms,
        block_count: modelData.meta.block_count,
        char_count: modelData.meta.char_count,
        word_count: modelData.meta.word_count,
        confidence: modelData.meta.confidence,
        element_counts: modelData.meta.element_counts
      };
    });
    
    return differences;
  };

  const differences = getModelDifferences();

  return (
    <div className="space-y-4">
      {/* Metrics Summary Table */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Model Comparison Metrics</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="p-2 text-left font-medium text-gray-800 dark:text-gray-200">Metric</th>
                {selected.map(model => (
                  <th key={model} className="p-2 text-left font-medium capitalize text-gray-800 dark:text-gray-200">{model}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Extraction Time</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.time_ms?.toFixed(0) || 'N/A'}ms</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Elements Detected</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.block_count || 0} blocks</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Character Count</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.char_count?.toLocaleString() || 0}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Word Count</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.word_count?.toLocaleString() || 0}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Titles</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.element_counts?.titles || 0}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Headers</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.element_counts?.headers || 0}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Paragraphs</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.element_counts?.paragraphs || 0}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Tables</td>
                {selected.map(model => (
                  <td key={model} className="p-2">{data[model]?.meta?.element_counts?.tables || 0}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2 font-medium">Confidence Score</td>
                {selected.map(model => (
                  <td key={model} className="p-2">
                    {data[model]?.meta?.confidence ? `${(data[model].meta.confidence * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('images')}
          className={clsx(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'images'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          )}
        >
          Annotated Images
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={clsx(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'text'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          )}
        >
          Extracted Text
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {selected.map((model) => (
          <div key={model} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-3 flex items-start justify-between">
              <h4 className="text-base font-semibold capitalize text-gray-800 dark:text-gray-200">{model}</h4>
              <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                <div>{data[model]?.meta?.time_ms?.toFixed(0) || 'N/A'}ms</div>
                <div>{data[model]?.meta?.block_count || 0} blocks</div>
              </div>
            </div>

            {activeTab === 'images' && (
              <div className="max-h-[50vh] overflow-auto">
                {data[model]?.annotated_images?.map((src, idx) => (
                  <img 
                    key={idx} 
                    src={src} 
                    alt={`${model} page ${idx + 1}`} 
                    className="mx-auto mb-2 w-full max-w-full rounded border border-gray-200 dark:border-gray-700" 
                  />
                ))}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-3">
                <div className="prose prose-sm prose-gray dark:prose-invert max-h-[40vh] overflow-auto">
                  <ReactMarkdown>{data[model]?.text_markdown || "(no text)"}</ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded border border-gray-300 bg-gray-200 px-2 py-1 text-xs text-gray-800 hover:bg-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => navigator.clipboard.writeText(data[model]?.text_markdown || "")}
                  >
                    Copy
                  </button>
                  <button
                    className="rounded border border-gray-300 bg-gray-200 px-2 py-1 text-xs text-gray-800 hover:bg-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => {
                      const blob = new Blob([data[model]?.text_markdown || ""], { type: "text/markdown;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${model}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Highlight differences */}
      {selected.length > 1 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <h4 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">Key Differences</h4>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <strong>Fastest:</strong> {
                  Object.entries(differences).reduce((fastest, [model, meta]) => 
                    !fastest || meta.time_ms < differences[fastest].time_ms ? model : fastest, 
                    ''
                  )
                } ({Math.min(...Object.values(differences).map((d: any) => d.time_ms)).toFixed(0)}ms)
              </div>
              <div>
                <strong>Most Elements:</strong> {
                  Object.entries(differences).reduce((highest, [model, meta]) => 
                    !highest || meta.block_count > differences[highest].block_count ? model : highest, 
                    ''
                  )
                } ({Math.max(...Object.values(differences).map((d: any) => d.block_count))} blocks)
              </div>
              <div>
                <strong>Most Text:</strong> {
                  Object.entries(differences).reduce((highest, [model, meta]) => 
                    !highest || meta.char_count > differences[highest].char_count ? model : highest, 
                    ''
                  )
                } ({Math.max(...Object.values(differences).map((d: any) => d.char_count)).toLocaleString()} chars)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
