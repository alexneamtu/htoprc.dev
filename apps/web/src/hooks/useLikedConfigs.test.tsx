import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe, never } from 'wonka'
import type { ReactNode } from 'react'
import { useLikedConfigs } from './useLikedConfigs'

function createMockClient(data: unknown) {
  return {
    executeQuery: vi.fn(() =>
      pipe(
        fromValue({ data }),
        delay(0)
      )
    ),
    executeMutation: vi.fn(),
    executeSubscription: vi.fn(),
  }
}

function createPausedMockClient() {
  return {
    executeQuery: vi.fn(() => never),
    executeMutation: vi.fn(),
    executeSubscription: vi.fn(),
  }
}

function createWrapper(client: ReturnType<typeof createMockClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider value={client as never}>{children}</Provider>
  }
}

describe('useLikedConfigs', () => {
  it('fetches liked configs for a user', async () => {
    const mockData = {
      likedConfigs: [
        {
          id: '123',
          slug: 'liked-config-1',
          title: 'My Liked Config',
          content: 'htop_version=3.2.1',
          sourceType: 'uploaded',
          sourceUrl: null,
          sourcePlatform: null,
          status: 'published',
          score: 15,
          likesCount: 10,
          createdAt: '2026-01-14T00:00:00Z',
        },
        {
          id: '456',
          slug: 'liked-config-2',
          title: 'Another Liked Config',
          content: 'htop_version=3.2.0',
          sourceType: 'scraped',
          sourceUrl: 'https://example.com',
          sourcePlatform: 'github',
          status: 'published',
          score: 25,
          likesCount: 20,
          createdAt: '2026-01-13T00:00:00Z',
        },
      ],
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useLikedConfigs('user-123'), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.likedConfigs).toHaveLength(2)
    expect(result.current.data?.likedConfigs[0].title).toBe('My Liked Config')
    expect(result.current.data?.likedConfigs[1].title).toBe('Another Liked Config')
  })

  it('returns empty array when user has no liked configs', async () => {
    const mockData = { likedConfigs: [] }
    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useLikedConfigs('user-456'), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.likedConfigs).toEqual([])
  })

  it('pauses query when userId is undefined', () => {
    const mockClient = createPausedMockClient()
    const wrapper = createWrapper(mockClient)

    renderHook(() => useLikedConfigs(undefined), { wrapper })

    // Query should not be executed when paused
    expect(mockClient.executeQuery).not.toHaveBeenCalled()
  })
})
