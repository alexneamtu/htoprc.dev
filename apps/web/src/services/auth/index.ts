import { useAuth as useClerkAuth, useSignIn as useClerkSignIn, useSignOut as useClerkSignOut } from './clerk'
import type { AuthState } from './types'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const fallbackGetToken = async () => null

// Wrapper hooks that handle Clerk being disabled
// This allows components to call hooks unconditionally (React Rules of Hooks)
export function useAuth(): AuthState {
  // When Clerk is disabled, return a static fallback
  if (!CLERK_ENABLED) {
    return { user: null, isLoaded: true, isSignedIn: false, getToken: fallbackGetToken }
  }
  return useClerkAuth()
}

export function useSignIn(): () => void {
  if (!CLERK_ENABLED) {
    return () => console.warn('Auth is disabled')
  }
  return useClerkSignIn()
}

export function useSignOut(): () => void {
  if (!CLERK_ENABLED) {
    return () => console.warn('Auth is disabled')
  }
  return useClerkSignOut()
}

export type { User, AuthState, AuthService } from './types'
