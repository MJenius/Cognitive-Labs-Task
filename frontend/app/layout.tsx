export const metadata = {
  title: 'PDF Extraction Playground',
  description: 'Compare Surya, Docling, and MinerU on PDFs',
};

import './globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
