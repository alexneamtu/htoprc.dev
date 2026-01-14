import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react'
import type { AuthState, AuthService } from './types'

function useAuth(): AuthState {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useClerkAuth()

  return {
    user: user
      ? {
          id: user.id,
          username: user.username,
          avatarUrl: user.imageUrl,
          email: user.primaryEmailAddress?.emailAddress ?? null,
        }
      : null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
  }
}

function useSignIn() {
  const { openSignIn } = useClerk()
  return () => openSignIn()
}

function useSignOut() {
  const { signOut } = useClerk()
  return () => signOut()
}

export const clerkAuthService: AuthService = {
  useAuth,
  signIn: () => {
    // This is a placeholder - actual sign in is handled by hooks
    console.warn('Use useSignIn hook instead')
  },
  signOut: () => {
    // This is a placeholder - actual sign out is handled by hooks
    console.warn('Use useSignOut hook instead')
  },
}

export { useAuth, useSignIn, useSignOut }
