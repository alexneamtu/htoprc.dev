import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock Clerk hooks before importing the module
const mockUseUser = vi.fn()
const mockUseClerk = vi.fn()
const mockUseClerkAuth = vi.fn()

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => mockUseUser(),
  useClerk: () => mockUseClerk(),
  useAuth: () => mockUseClerkAuth(),
}))

// Import after mocking
import { useAuth, useSignIn, useSignOut, clerkAuthService } from './clerk'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null user when not signed in', () => {
    mockUseUser.mockReturnValue({ user: null, isLoaded: true })
    mockUseClerkAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isSignedIn).toBe(false)
    expect(result.current.isLoaded).toBe(true)
  })

  it('returns user data when signed in', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      imageUrl: 'https://example.com/avatar.jpg',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    }
    const mockGetToken = vi.fn()

    mockUseUser.mockReturnValue({ user: mockUser, isLoaded: true })
    mockUseClerkAuth.mockReturnValue({ isSignedIn: true, getToken: mockGetToken })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toEqual({
      id: 'user-123',
      username: 'testuser',
      avatarUrl: 'https://example.com/avatar.jpg',
      email: 'test@example.com',
    })
    expect(result.current.isSignedIn).toBe(true)
    expect(result.current.getToken).toBe(mockGetToken)
  })

  it('handles null email address', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      imageUrl: 'https://example.com/avatar.jpg',
      primaryEmailAddress: null,
    }

    mockUseUser.mockReturnValue({ user: mockUser, isLoaded: true })
    mockUseClerkAuth.mockReturnValue({ isSignedIn: true, getToken: vi.fn() })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user?.email).toBeNull()
  })

  it('handles undefined isSignedIn', () => {
    mockUseUser.mockReturnValue({ user: null, isLoaded: false })
    mockUseClerkAuth.mockReturnValue({ isSignedIn: undefined, getToken: vi.fn() })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isSignedIn).toBe(false)
    expect(result.current.isLoaded).toBe(false)
  })
})

describe('useSignIn', () => {
  it('returns a function that calls openSignIn', () => {
    const mockOpenSignIn = vi.fn()
    mockUseClerk.mockReturnValue({ openSignIn: mockOpenSignIn })

    const { result } = renderHook(() => useSignIn())

    result.current()

    expect(mockOpenSignIn).toHaveBeenCalled()
  })
})

describe('useSignOut', () => {
  it('returns a function that calls signOut', () => {
    const mockSignOut = vi.fn()
    mockUseClerk.mockReturnValue({ signOut: mockSignOut })

    const { result } = renderHook(() => useSignOut())

    result.current()

    expect(mockSignOut).toHaveBeenCalled()
  })
})

describe('clerkAuthService', () => {
  it('has useAuth method', () => {
    expect(clerkAuthService.useAuth).toBe(useAuth)
  })

  it('signIn logs warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    clerkAuthService.signIn()

    expect(consoleSpy).toHaveBeenCalledWith('Use useSignIn hook instead')
    consoleSpy.mockRestore()
  })

  it('signOut logs warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    clerkAuthService.signOut()

    expect(consoleSpy).toHaveBeenCalledWith('Use useSignOut hook instead')
    consoleSpy.mockRestore()
  })
})
