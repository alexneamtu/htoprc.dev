import { useAuth as useClerkAuth, useSignIn as useClerkSignIn, useSignOut as useClerkSignOut } from './clerk'
import type { AuthState } from './types'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Wrapper hooks that handle Clerk being disabled
// This allows components to call hooks unconditionally (React Rules of Hooks)
export function useAuth(): AuthState {
  // Always call the Clerk hook to maintain consistent hook call order
  // When Clerk is disabled, ClerkProvider isn't mounted so we need a fallback
  if (!CLERK_ENABLED) {
    return { user: null, isLoaded: true, isSignedIn: false }
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth()
}

export function useSignIn(): () => void {
  if (!CLERK_ENABLED) {
    return () => console.warn('Auth is disabled')
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkSignIn()
}

export function useSignOut(): () => void {
  if (!CLERK_ENABLED) {
    return () => console.warn('Auth is disabled')
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkSignOut()
}

export type { User, AuthState, AuthService } from './types'
