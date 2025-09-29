import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-800 bg-gray-900/60 p-3 lg:block">
      <div className="flex items-center gap-2 px-2 py-3 text-gray-200">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600/20 text-blue-400">∿</div>
        <span className="font-semibold">Playground</span>
      </div>

      <nav className="mt-4 space-y-6 text-sm">
        <div>
          <div className="px-2 text-xs uppercase tracking-wider text-gray-400">Navigation</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-200 hover:bg-gray-800/70">
                New Extraction
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Examples
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Settings
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="px-2 text-xs uppercase tracking-wider text-gray-400">Resources</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Console
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Documentation
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="px-2 text-xs uppercase tracking-wider text-gray-400">Quick Links</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Production Access
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Pricing Info
              </Link>
            </li>
            <li>
              <Link href="#" className="block rounded px-2 py-1.5 text-gray-300 hover:bg-gray-800/70">
                Book a Demo
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="mt-auto"></div>
    </aside>
  );
}
