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
  settings: {
    selectedModels: ModelKey[];
    primaryModel: ModelKey;
    compare: boolean;
    pageStart: string; // keep as string for input binding
    pageEnd: string;
  };
  previewData?: string | null;
  progress?: number; // 0-100
}

export default function HomePage() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false); // any file currently processing
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Helper to update settings of a specific (active) file
  const updateFileSettings = (fileId: string, updater: (prev: FileState['settings']) => FileState['settings']) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, settings: updater(f.settings) } : f));
  };

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const activeResult = activeFile?.result || null;
  const activeSettings = activeFile?.settings;

  const appendFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newStates: FileState[] = [];
    Array.from(fileList).forEach((f, idx) => {
      const isPdf = (f.type === 'application/pdf') || f.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) return; // silently skip non-pdf
      const id = `${Date.now()}-${f.name}-${idx}-${Math.random().toString(36).slice(2,8)}`;
      newStates.push({ id, file: f, status: 'pending', result: null, error: null, previewData: null, progress: 0, settings: {
        selectedModels: [...ALL_MODELS],
        primaryModel: 'surya',
        compare: false,
        pageStart: '',
        pageEnd: ''
      } });
    });
    if (newStates.length) {
      setFiles(prev => [...prev, ...newStates]);
      if (!activeFileId) setActiveFileId(newStates[0].id);
      setGlobalError(null);
      newStates.forEach(fs => generatePreview(fs.id, fs.file));
    } else if (fileList.length > 0) {
      setGlobalError('Only PDF files are accepted (.pdf)');
    }
  };

  const generatePreview = async (fileId: string, file: File) => {
    try {
      if (typeof window === 'undefined') return; // SSR guard
      let pdfjs: any;
      try {
        pdfjs = await import('pdfjs-dist');
      } catch {
        pdfjs = await import('pdfjs-dist/build/pdf');
      }
      // attempt to set worker if available
      try {
        const worker = await import('pdfjs-dist/build/pdf.worker.mjs');
        // @ts-ignore
        if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = worker;
      } catch { /* ignore */ }
      const data = await file.arrayBuffer();
      const loadingTask = (pdfjs as any).getDocument({ data });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.25 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const url = canvas.toDataURL('image/png');
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, previewData: url } : f));
    } catch (e) {
      console.warn('Preview generation failed', e);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, previewData: null } : f));
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
    if (!activeFile) return;
    updateFileSettings(activeFile.id, (prev) => {
      const set = new Set(prev.selectedModels);
      if (set.has(m)) set.delete(m); else set.add(m);
      let arr = Array.from(set) as ModelKey[];
      if (arr.length === 0) arr = []; // allow empty but will disable extract button
      let primaryModel = prev.primaryModel;
      if (!arr.includes(primaryModel) && arr.length > 0) primaryModel = arr[0];
      return { ...prev, selectedModels: arr, primaryModel };
    });
  };

  const simulateProgress = (fileId: string) => {
    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(95, pct + 5 + Math.random()*8);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: pct } : f));
    }, 350);
    return interval;
  };

  const processSingleFile = async (fileId: string) => {
    const fState = files.find(f => f.id === fileId);
    if (!fState) return;
    const { selectedModels, pageStart, pageEnd } = fState.settings;
    if (!selectedModels.length) return;
    setLoading(true);
    setFiles(prev => prev.map(fs => fs.id === fileId ? { ...fs, status: 'uploading', error: null, progress: 5 } : fs));
    const interval = simulateProgress(fileId);
    try {
      const form = new FormData();
      form.append('file', fState.file);
      form.append('models', selectedModels.join(','));
      const ps = parseInt(pageStart, 10);
      const pe = parseInt(pageEnd, 10);
      if (!isNaN(ps)) form.append('page_start', String(ps));
      if (!isNaN(pe)) form.append('page_end', String(pe));
      const res = await fetch(`${BACKEND_URL}/api/extract`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: ExtractResponse = await res.json();
      setFiles(prev => prev.map(fs => fs.id === fileId ? { ...fs, status: 'done', result: data, progress: 100 } : fs));
      if (!activeFileId) setActiveFileId(fState.id);
    } catch (err: any) {
      const msg = err?.message || 'Upload failed';
      setFiles(prev => prev.map(fs => fs.id === fileId ? { ...fs, status: 'error', error: msg, progress: 0 } : fs));
      setGlobalError(msg);
    } finally {
      clearInterval(interval);
    }
    setLoading(false);
  };

  const extractAllPending = async () => {
    if (!files.length) return;
    setLoading(true);
    setGlobalError(null);
    for (let i = 0; i < files.length; i++) {
      const fState = files[i];
      if (fState.status === 'uploading') continue;
      const { selectedModels, pageStart, pageEnd } = fState.settings;
      if (!selectedModels.length) continue; // skip if user deselected all
      setFiles(prev => prev.map(fs => fs.id === fState.id ? { ...fs, status: 'uploading', error: null, progress: 5 } : fs));
      const interval = simulateProgress(fState.id);
      try {
        const form = new FormData();
        form.append('file', fState.file);
        form.append('models', selectedModels.join(','));
        const ps = parseInt(pageStart, 10);
        const pe = parseInt(pageEnd, 10);
        if (!isNaN(ps)) form.append('page_start', String(ps));
        if (!isNaN(pe)) form.append('page_end', String(pe));
        const res = await fetch(`${BACKEND_URL}/api/extract`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: ExtractResponse = await res.json();
        setFiles(prev => prev.map(fs => fs.id === fState.id ? { ...fs, status: 'done', result: data, progress: 100 } : fs));
        if (!activeFileId) setActiveFileId(fState.id);
      } catch (err: any) {
        const msg = err?.message || 'Upload failed';
        setFiles(prev => prev.map(fs => fs.id === fState.id ? { ...fs, status: 'error', error: msg, progress: 0 } : fs));
        setGlobalError(msg);
      } finally {
        clearInterval(interval);
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

  const selectedModels = useMemo(() => activeSettings?.selectedModels || [], [activeSettings]);
  const primaryModel = activeSettings?.primaryModel || 'surya';
  const compare = activeSettings?.compare || false;
  const pageStart = activeSettings?.pageStart || '';
  const pageEnd = activeSettings?.pageEnd || '';

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

  <section className="grid gap-4 lg:grid-cols-2 lg:min-h-[calc(100vh-7rem)]">
          {/* Left: Upload dropzone */}
          <div
            className={clsx(
              "relative flex h-72 lg:h-full cursor-pointer items-center justify-center rounded-lg border border-dashed p-4 transition-colors",
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
                  <ul className="mx-auto mb-3 w-full overflow-auto rounded border border-gray-200 bg-white p-1 text-left dark:border-gray-700 dark:bg-gray-800/60 lg:max-h-full" style={{maxHeight: 'calc(100vh - 16rem)'}}>
                    {files.map(f => (
                      <li key={f.id} className={clsx('group flex flex-col gap-1 rounded px-2 py-2 text-xs', activeFileId === f.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50')}>
                        <div className="flex items-center gap-2">
                          <button
                            className="flex-1 truncate text-left text-gray-700 dark:text-gray-200"
                            title={f.file.name}
                            onClick={(e) => { e.stopPropagation(); setActiveFileId(f.id); }}
                          >
                            {f.file.name}
                          </button>
                          <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                            f.status === 'pending' && 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                            f.status === 'uploading' && 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
                            f.status === 'done' && 'bg-green-500/20 text-green-700 dark:bg-green-500/20 dark:text-green-300',
                            f.status === 'error' && 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-300'
                          )}>{f.status}{f.status === 'uploading' && typeof f.progress === 'number' ? ` ${(f.progress|0)}%` : ''}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600/50 dark:hover:text-gray-200"
                            aria-label="Remove file"
                          >×</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 flex items-center justify-center">
                            {f.previewData ? <img src={f.previewData} alt="preview" className="h-full w-full object-cover" /> : <span className="text-[9px] text-gray-500 dark:text-gray-400">Preview</span>}
                          </div>
                          <div className="flex-1">
                            {f.status === 'uploading' && (
                              <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, f.progress||0)}%` }} />
                              </div>
                            )}
                            {f.status === 'done' && (
                              <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                                <div className="h-full bg-green-500" style={{ width: '100%' }} />
                              </div>
                            )}
                            {f.status === 'error' && (
                              <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                                <div className="h-full bg-red-500" style={{ width: '100%' }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Drag & drop or click to add more PDFs</p>
                </>
              )}
            </div>
            <input id="file-input" ref={inputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden" onChange={onSelectFile} />
          </div>

          {/* Right: Controls & status panel */}
          <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 lg:h-full">
            <div className="sticky top-0 z-10 border-b border-gray-200/70 bg-gray-50/95 p-4 backdrop-blur dark:border-gray-800/70 dark:bg-gray-900/80">
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between">Models
                  {activeFile && activeFile.result && (
                    <button
                      onClick={() => processSingleFile(activeFile.id)}
                      className="ml-2 rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      disabled={loading}
                    >Re-Extract</button>
                  )}
                </div>
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
                    onChange={(e) => activeFile && updateFileSettings(activeFile.id, prev => ({ ...prev, compare: e.target.checked }))}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Page From</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      value={pageStart}
                      onChange={(e) => activeFile && updateFileSettings(activeFile.id, prev => ({ ...prev, pageStart: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Page To</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      value={pageEnd}
                      onChange={(e) => activeFile && updateFileSettings(activeFile.id, prev => ({ ...prev, pageEnd: e.target.value }))}
                      placeholder="End"
                    />
                  </div>
                </div>
                <div className="pt-1">
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                      onClick={() => activeFile && processSingleFile(activeFile.id)}
                      disabled={!activeFile || !selectedModels.length || loading}
                    >
                      {loading && activeFile?.status === 'uploading' ? 'Processing…' : 'Extract This File'}
                    </button>
                    <button
                      className="flex-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                      onClick={extractAllPending}
                      disabled={!files.length || loading}
                    >
                      {loading ? 'Batch…' : 'Extract All'}
                    </button>
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
                    <span>{files.length} file(s)</span>
                    <span>{files.filter(f => f.status === 'done').length} done</span>
                  </div>
                )}
              </div>
              </div>
            </div>
            {globalError && <div className="m-4 rounded bg-red-100 p-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300">{globalError}</div>}
            <div className="flex-1 overflow-auto p-4">
              {!activeResult ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="text-4xl">📄</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{files.length ? 'Add files or click Extract to process.' : 'No files selected yet'}</div>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="rounded border border-gray-200 bg-white p-3 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800/70">
                    <div><strong className="font-semibold">File:</strong> {activeFile?.file.name}</div>
                    <div><strong className="font-semibold">Pages:</strong> {activeResult.pages}</div>
                    {(!isNaN(parseInt(pageStart)) || !isNaN(parseInt(pageEnd))) && (
                      <div><strong className="font-semibold">Range:</strong> {pageStart || '1'} – {pageEnd || 'End'}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Scroll down to view results below.</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        {activeResult && (
          <section className="mt-6 space-y-4">
            {!compare ? (
              <DualPane model={primaryModel as ModelKey} data={activeResult.models[primaryModel]} />
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
