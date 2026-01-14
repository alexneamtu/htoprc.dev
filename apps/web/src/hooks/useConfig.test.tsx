import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe } from 'wonka'
import type { ReactNode } from 'react'
import { useConfig } from './useConfig'

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

describe('useConfig', () => {
  it('fetches config by id', async () => {
    const mockData = {
      config: {
        id: '123',
        slug: 'test-config',
        title: 'Test Config',
        content: 'htop_version=3.2.1',
        sourceType: 'uploaded',
        sourceUrl: null,
        sourcePlatform: null,
        status: 'published',
        score: 15,
        likesCount: 10,
        createdAt: '2026-01-14T00:00:00Z',
      },
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useConfig({ id: '123' }), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.config).toBeDefined()
    expect(result.current.data?.config?.id).toBe('123')
    expect(result.current.data?.config?.title).toBe('Test Config')
  })

  it('fetches config by slug', async () => {
    const mockData = {
      config: {
        id: '456',
        slug: 'my-slug',
        title: 'Config by Slug',
        content: 'htop_version=3.2.1',
        sourceType: 'seeded',
        sourceUrl: null,
        sourcePlatform: null,
        status: 'published',
        score: 20,
        likesCount: 5,
        createdAt: '2026-01-14T00:00:00Z',
      },
    }

    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useConfig({ slug: 'my-slug' }), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.config?.slug).toBe('my-slug')
  })

  it('returns null for non-existent config', async () => {
    const mockData = { config: null }
    const mockClient = createMockClient(mockData)
    const wrapper = createWrapper(mockClient)

    const { result } = renderHook(() => useConfig({ id: 'non-existent' }), { wrapper })

    await waitFor(() => {
      expect(result.current.fetching).toBe(false)
    })

    expect(result.current.data?.config).toBeNull()
  })
})
