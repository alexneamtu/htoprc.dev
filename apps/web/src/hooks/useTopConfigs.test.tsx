import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe } from 'wonka'
import type { ReactNode } from 'react'
import { useTopConfigs } from './useTopConfigs'

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

describe('useTopConfigs', () => {
  it('fetches top configs from API', async () => {
    const mockData = {
      configs: {
        nodes: [
          {
            id: '1',
            slug: 'top-config',
            title: 'Top Config',
            content: 'htop_version=3.2.1',
            score: 25,
            likesCount: 10,
          },
        ],
      },
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useTopConfigs(), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.configs.nodes).toHaveLength(1)
    expect(result.current.data?.configs.nodes[0].title).toBe('Top Config')
    expect(result.current.data?.configs.nodes[0].score).toBe(25)
  })

  it('supports custom limit', async () => {
    const mockData = {
      configs: {
        nodes: [
          { id: '1', slug: 'config-1', title: 'Config 1', content: '', score: 30, likesCount: 0 },
          { id: '2', slug: 'config-2', title: 'Config 2', content: '', score: 25, likesCount: 0 },
          { id: '3', slug: 'config-3', title: 'Config 3', content: '', score: 20, likesCount: 0 },
          { id: '4', slug: 'config-4', title: 'Config 4', content: '', score: 15, likesCount: 0 },
          { id: '5', slug: 'config-5', title: 'Config 5', content: '', score: 10, likesCount: 0 },
        ],
      },
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useTopConfigs(5), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.configs.nodes).toHaveLength(5)
  })

  it('returns loading state initially', () => {
    const mockClient = createMockClient({ configs: { nodes: [] } })
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useTopConfigs(), { wrapper })

    expect(result.current.fetching).toBe(true)
  })
})
