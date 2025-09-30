import Link from "next/link";
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  currentFileName?: string | null;
  uploadStatus?: 'idle' | 'selected' | 'uploading' | 'done' | 'error';
}

export default function Sidebar({ currentFileName, uploadStatus }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/60 lg:block">
      <div className="flex items-center gap-2 px-2 py-3 text-gray-800 dark:text-gray-200">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600/20 text-blue-600 dark:text-blue-400">∿</div>
        <span className="font-semibold">Playground</span>
      </div>

      <nav className="mt-4 space-y-6 text-sm">
        <div>
          <div className="px-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Navigation</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/" className="block rounded px-2 py-1.5 text-gray-800 hover:bg-gray-200/70 dark:text-gray-200 dark:hover:bg-gray-800/70">
                Scan PDF
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                Examples
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="px-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Resources</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/docs" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                Documentation
              </Link>
            </li>
          </ul>
        </div>

        {/* File Status */}
        {currentFileName && (
          <div>
            <div className="px-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Current File</div>
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {currentFileName}
              </div>
              <div className={`mt-1 text-xs ${
                uploadStatus === 'uploading' ? 'text-blue-600 dark:text-blue-400' :
                uploadStatus === 'done' ? 'text-green-600 dark:text-green-400' :
                uploadStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {uploadStatus === 'uploading' ? 'Processing...' :
                 uploadStatus === 'done' ? 'Extraction completed' :
                 uploadStatus === 'error' ? 'Error occurred' :
                 uploadStatus === 'selected' ? 'Ready to extract' : 'Idle'}
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto pt-4">
        <div className="px-2">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
