import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe } from 'wonka'
import type { ReactNode } from 'react'
import { useConfigs } from './useConfigs'

// Mock urql client
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

describe('useConfigs', () => {
  it('fetches configs from API', async () => {
    const mockData = {
      configs: {
        nodes: [
          {
            id: '1',
            slug: 'test-config',
            title: 'Test Config',
            content: 'htop_version=3.2.1',
            sourceType: 'uploaded',
            score: 10,
            likesCount: 5,
            createdAt: '2026-01-14T00:00:00Z',
          },
        ],
        totalCount: 1,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          page: 1,
          totalPages: 1,
        },
      },
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useConfigs(), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.configs.nodes).toHaveLength(1)
    expect(result.current.data?.configs.nodes[0].title).toBe('Test Config')
    expect(result.current.data?.configs.totalCount).toBe(1)
  })

  it('supports pagination', async () => {
    const mockData = {
      configs: {
        nodes: [],
        totalCount: 50,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          page: 1,
          totalPages: 3,
        },
      },
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useConfigs({ page: 1, limit: 20 }), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.configs.pageInfo.hasNextPage).toBe(true)
    expect(result.current.data?.configs.pageInfo.totalPages).toBe(3)
  })

  it('returns loading state initially', () => {
    const mockClient = createMockClient({ configs: { nodes: [], totalCount: 0 } })
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useConfigs(), { wrapper })

    expect(result.current.fetching).toBe(true)
  })
})
