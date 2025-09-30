export const metadata = {
  title: 'PDF Extraction Playground',
  description: 'Compare Surya, Docling, and MinerU on PDFs',
};

import './globals.css';
import { ReactNode } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
