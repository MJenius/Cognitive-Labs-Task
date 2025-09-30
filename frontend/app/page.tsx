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

interface FileState {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  result?: ExtractResponse | null;
  error?: string | null;
}

export default function HomePage() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<ModelKey[]>([...ALL_MODELS]);
  const [primary, setPrimary] = useState<ModelKey>("surya");
  const [loading, setLoading] = useState(false); // any file currently processing
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [compare, setCompare] = useState<boolean>(false);

  const appendFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newStates: FileState[] = [];
    Array.from(fileList).forEach((f, idx) => {
      const isPdf = (f.type === 'application/pdf') || f.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) return; // silently skip non-pdf
      const id = `${Date.now()}-${f.name}-${idx}-${Math.random().toString(36).slice(2,8)}`;
      newStates.push({ id, file: f, status: 'pending', result: null, error: null });
    });
    if (newStates.length) {
      setFiles(prev => [...prev, ...newStates]);
      if (!activeFileId) setActiveFileId(newStates[0].id);
      setGlobalError(null);
    } else if (fileList.length > 0) {
      setGlobalError('Only PDF files are accepted (.pdf)');
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    appendFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId]);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    appendFiles(e.target.files);
    // reset input so selecting same file again re-triggers
    if (inputRef.current) inputRef.current.value = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId]);

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
    if (!files.length) return;
    setLoading(true);
    setGlobalError(null);
    // process each file sequentially for simplicity
    for (let i = 0; i < files.length; i++) {
      const fState = files[i];
      if (fState.status === 'uploading') continue; // skip already processing
      // mark uploading
      setFiles(prev => prev.map(fs => fs.id === fState.id ? { ...fs, status: 'uploading', error: null } : fs));
      try {
        const form = new FormData();
        form.append('file', fState.file);
        form.append('models', selected.join(','));
        const res = await fetch(`${BACKEND_URL}/api/extract`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: ExtractResponse = await res.json();
        setFiles(prev => prev.map(fs => fs.id === fState.id ? { ...fs, status: 'done', result: data } : fs));
        if (!activeFileId) setActiveFileId(fState.id);
      } catch (err: any) {
        const msg = err?.message || 'Upload failed';
        setFiles(prev => prev.map(fs => fs.id === fState.id ? { ...fs, status: 'error', error: msg } : fs));
        setGlobalError(msg);
      }
    }
    setLoading(false);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) {
      // pick another file if exists
      setActiveFileId(prev => {
        const remaining = files.filter(f => f.id !== id);
        return remaining.length ? remaining[0].id : null;
      });
    }
  };

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const activeResult = activeFile?.result || null;

  const selectedModels = useMemo(() => selected.filter((m) => ALL_MODELS.includes(m)), [selected]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        currentFileName={activeFile?.file.name ?? null}
        uploadStatus={loading ? 'uploading' : activeFile ? activeFile.status === 'done' ? 'done' : activeFile.status === 'error' ? 'error' : activeFile.status === 'uploading' ? 'uploading' : 'selected' : 'idle'}
      />
      
      <MobileSidebar
        currentFileName={activeFile?.file.name ?? null}
        uploadStatus={loading ? 'uploading' : activeFile ? activeFile.status === 'done' ? 'done' : activeFile.status === 'error' ? 'error' : activeFile.status === 'uploading' ? 'uploading' : 'selected' : 'idle'}
      />
      
      {/* Mobile header with theme toggle */}
      <div className="border-b border-gray-200 bg-gray-50 p-4 pl-16 dark:border-gray-800 dark:bg-gray-900 lg:hidden lg:pl-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">PDF Extraction</h1>
          </div>
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
              {files.length === 0 ? (
                <>
                  <p className="font-medium text-gray-800 dark:text-gray-200">Drag and drop files here, or click to upload</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Allowed files: PDF</p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">Selected Files</p>
                  <ul className="mx-auto mb-3 max-h-40 w-full overflow-auto rounded border border-gray-200 bg-white p-1 text-left dark:border-gray-700 dark:bg-gray-800/60">
                    {files.map(f => (
                      <li key={f.id} className={clsx('group flex items-center gap-2 rounded px-2 py-1 text-xs', activeFileId === f.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50')}>
                        <button
                          className="flex-1 truncate text-left text-gray-700 dark:text-gray-200"
                          title={f.file.name}
                          onClick={(e) => { e.stopPropagation(); setActiveFileId(f.id); }}
                        >
                          {f.file.name}
                        </button>
                        <span className="hidden shrink-0 text-gray-500 dark:text-gray-400 sm:inline">{Math.ceil(f.file.size/1024)} KB</span>
                        <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                          f.status === 'pending' && 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                          f.status === 'uploading' && 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
                          f.status === 'done' && 'bg-green-500/20 text-green-700 dark:bg-green-500/20 dark:text-green-300',
                          f.status === 'error' && 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-300'
                        )}>{f.status}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                          className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600/50 dark:hover:text-gray-200"
                          aria-label="Remove file"
                        >×</button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Drag & drop or click to add more PDFs</p>
                </>
              )}
            </div>
            <input id="file-input" ref={inputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden" onChange={onSelectFile} />
          </div>

          {/* Right: Empty state & controls */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            {!activeResult ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="text-4xl">📄</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{files.length ? 'Select extract to view or run extraction' : 'No files selected yet'}</div>
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
              <div className="text-sm text-gray-700 dark:text-gray-300">Processed {activeResult.pages} page(s) • File: {activeFile?.file.name}</div>
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
                  disabled={files.length === 0 || selectedModels.length === 0 || loading}
                >
                  {loading ? 'Processing Files...' : `Extract (${files.filter(f=>f.status!== 'done').length || 'All Done'})`}
                </button>
                {globalError && <div className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300">{globalError}</div>}
                {files.length > 0 && <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{files.length} file(s) selected</div>}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        {activeResult && (
          <section className="mt-6 space-y-4">
            {!compare ? (
              <DualPane model={primary} data={activeResult.models[primary]} />
            ) : (
              <ComparisonGrid selected={selectedModels} data={activeResult.models} />
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
