import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-htop-header">
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white hover:text-gray-300">
            htoprc.dev
          </Link>
          <div className="flex gap-4">
            <Link to="/" className="text-gray-300 hover:text-white">
              Gallery
            </Link>
            <Link to="/editor" className="text-gray-300 hover:text-white">
              Editor
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-gray-800 py-4 text-center text-gray-500 text-sm">
        <p>
          Open source on{' '}
          <a
            href="https://github.com/alexneamtu/htoprc.dev"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}
