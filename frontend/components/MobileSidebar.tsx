"use client";

import { useState } from 'react';
import Link from "next/link";
import ThemeToggle from './ThemeToggle';

interface MobileSidebarProps {
  currentFileName?: string | null;
  uploadStatus?: 'idle' | 'selected' | 'uploading' | 'done' | 'error';
}

export default function MobileSidebar({ currentFileName, uploadStatus }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-50 p-3 transition-transform duration-300 ease-in-out dark:bg-gray-900 lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-3 text-gray-800 dark:text-gray-200">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600/20 text-blue-600 dark:text-blue-400">∿</div>
            <span className="font-semibold">Playground</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 space-y-6 text-sm">
          <div>
            <div className="px-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Navigation</div>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="#" className="block rounded px-2 py-1.5 text-gray-800 hover:bg-gray-200/70 dark:text-gray-200 dark:hover:bg-gray-800/70">
                  New Extraction
                </Link>
              </li>
              <li>
                <Link href="#" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                  Examples
                </Link>
              </li>
              <li>
                <Link href="#" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="px-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Resources</div>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="#" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                  Console
                </Link>
              </li>
              <li>
                <Link href="#" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="block rounded px-2 py-1.5 text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800/70">
                  Contact Support
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

          <div>
            <div className="px-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Theme</div>
            <div className="mt-2 px-2">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800 lg:hidden"
        aria-label="Open sidebar"
      >
        <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}