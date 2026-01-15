import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
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
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent py-6 text-center text-gray-500 dark:text-gray-500 text-sm">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <Link to="/about" className="hover:text-gray-700 dark:hover:text-gray-300">
            About
          </Link>
          <Link to="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">
            Privacy
          </Link>
          <a
            href="https://github.com/alexneamtu/htoprc.dev"
            className="hover:text-gray-700 dark:hover:text-gray-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
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
