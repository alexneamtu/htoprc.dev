import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe } from 'wonka'
import type { ReactNode } from 'react'
import { useRecentConfigs } from './useRecentConfigs'

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

function createWrapper(client: ReturnType<typeof createMockClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider value={client as never}>{children}</Provider>
  }
}

describe('useRecentConfigs', () => {
  it('fetches recent configs from API', async () => {
    const mockData = {
      recentConfigs: [
        {
          id: '1',
          slug: 'recent-config',
          title: 'Recent Config',
          content: 'htop_version=3.2.1',
          sourceType: 'uploaded',
          score: 10,
          likesCount: 5,
          createdAt: '2026-01-14T00:00:00Z',
        },
      ],
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useRecentConfigs(), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.recentConfigs).toHaveLength(1)
    expect(result.current.data?.recentConfigs[0].title).toBe('Recent Config')
  })

  it('supports custom limit', async () => {
    const mockData = {
      recentConfigs: [
        { id: '1', slug: 'config-1', title: 'Config 1', content: '', score: 0, likesCount: 0 },
        { id: '2', slug: 'config-2', title: 'Config 2', content: '', score: 0, likesCount: 0 },
        { id: '3', slug: 'config-3', title: 'Config 3', content: '', score: 0, likesCount: 0 },
      ],
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useRecentConfigs(3), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.recentConfigs).toHaveLength(3)
  })

  it('returns loading state initially', () => {
    const mockClient = createMockClient({ recentConfigs: [] })
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useRecentConfigs(), { wrapper })

    expect(result.current.fetching).toBe(true)
  })
})
