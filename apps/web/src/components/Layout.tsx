import { Link } from 'react-router-dom'
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )
}

function GuidesDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Guides
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <Link
            to="/what-is-htoprc"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            What is htoprc?
          </Link>
          <Link
            to="/customize-htop"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            Customize htop
          </Link>
          <Link
            to="/htop-config-quick-guide"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            Quick Guide
          </Link>
        </div>
      )}
    </div>
  )
}

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
        >
          <UserButton.MenuItems>
            <UserButton.Link label="My Likes" labelIcon={<HeartIcon />} href="/likes" />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
    </>
  )
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-htop-bg text-gray-900 dark:text-htop-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to main content
      </a>
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-htop-header shadow-sm">
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-gray-200">
            <img src="/favicon.svg" alt="htoprc logo" className="w-7 h-7" />
            htoprc.dev
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/gallery" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              Gallery
            </Link>
            <Link to="/editor" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              Editor
            </Link>
            <GuidesDropdown />
            {CLERK_ENABLED && (
              <SignedIn>
                <Link to="/upload" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  Upload
                </Link>
                <Link to="/admin" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  Dashboard
                </Link>
              </SignedIn>
            )}
            <ThemeToggle />
            <AuthButtons />
          </div>
        </nav>
      </header>
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent py-6 text-center text-gray-500 dark:text-gray-500 text-sm">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <Link to="/about" className="hover:text-gray-700 dark:hover:text-gray-300">
            About
          </Link>
          <Link to="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">
            Privacy
          </Link>
          <Link to="/what-is-htoprc" className="hover:text-gray-700 dark:hover:text-gray-300">
            What is htoprc
          </Link>
          <Link to="/customize-htop" className="hover:text-gray-700 dark:hover:text-gray-300">
            Customize htop
          </Link>
          <Link
            to="/htop-config-quick-guide"
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            Quick guide
          </Link>
          <a
            href="https://github.com/alexneamtu/htoprc.dev"
            className="hover:text-gray-700 dark:hover:text-gray-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@htoprc/parser"
            className="hover:text-gray-700 dark:hover:text-gray-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            npm
          </a>
        </div>
        <p className="mb-2">Open source project for the htop community</p>
        <p>
          Built with ❤️ by{' '}
          <a
            href="https://github.com/alexneamtu"
            className="text-blue-500 hover:text-blue-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            Alex Neamtu
          </a>
        </p>
      </footer>
    </div>
  )
}
