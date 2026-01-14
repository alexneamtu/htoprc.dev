import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function AuthButtons() {
  if (!CLERK_ENABLED) {
    return null
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            },
          }}
        />
      </SignedIn>
    </>
  )
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-htop-bg text-gray-900 dark:text-htop-fg">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-htop-header shadow-sm">
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-gray-200">
            <img src="/favicon.svg" alt="htoprc logo" className="w-7 h-7" />
            htoprc.dev
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              Gallery
            </Link>
            <Link to="/editor" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              Editor
            </Link>
            {CLERK_ENABLED && (
              <SignedIn>
                <Link to="/upload" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  Upload
                </Link>
              </SignedIn>
            )}
            <ThemeToggle />
            <AuthButtons />
          </div>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent py-4 text-center text-gray-500 dark:text-gray-500 text-sm">
        <p>
          Open source on{' '}
          <a
            href="https://github.com/alexneamtu/htoprc.dev"
            className="text-blue-600 dark:text-blue-400 hover:underline"
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
