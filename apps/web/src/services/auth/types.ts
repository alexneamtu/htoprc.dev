export interface User {
  id: string
  username: string | null
  avatarUrl: string | null
  email: string | null
}

export interface AuthState {
  user: User | null
  isLoaded: boolean
  isSignedIn: boolean
}

export interface AuthService {
  useAuth: () => AuthState
  signIn: () => void
  signOut: () => void
}
