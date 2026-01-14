import { useAuth, RedirectToSignIn } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = CLERK_ENABLED
    ? useAuth()
    : { isLoaded: true, isSignedIn: false }

  if (!CLERK_ENABLED) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Authentication is not configured.</p>
        <p className="text-gray-500 text-sm mt-2">Set VITE_CLERK_PUBLISHABLE_KEY to enable sign in.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />
  }

  return <>{children}</>
}
