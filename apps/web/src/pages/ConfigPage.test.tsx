import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'urql'
import { HelmetProvider } from 'react-helmet-async'
import { fromValue, delay, pipe } from 'wonka'
import { ConfigPage } from './ConfigPage'

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

function renderWithProviders(
  client: ReturnType<typeof createMockClient>,
  initialRoute: string
) {
  return render(
    <HelmetProvider>
      <Provider value={client as never}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/config/:slug" element={<ConfigPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </HelmetProvider>
  )
}

describe('ConfigPage', () => {
  it('displays config title and preview', async () => {
    const mockData = {
      config: {
        id: '123',
        slug: 'test-config',
        title: 'Test Config',
        content: 'htop_version=3.2.1\ncolor_scheme=5',
        sourceType: 'uploaded',
        sourceUrl: null,
        sourcePlatform: null,
        status: 'published',
        score: 25,
        likesCount: 10,
        createdAt: '2026-01-14T00:00:00Z',
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText('Test Config')).toBeInTheDocument()
    })

    expect(screen.getByText(/Score: 25/)).toBeInTheDocument()
    // LikeButton shows the count
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const mockClient = createMockClient({ config: null })
    renderWithProviders(mockClient, '/config/loading-config')

    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it('shows not found for non-existent config', async () => {
    const mockData = { config: null }
    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/non-existent')

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument()
    })
  })

  it('has Open in Editor link', async () => {
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
        likesCount: 5,
        createdAt: '2026-01-14T00:00:00Z',
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText(/Open in Editor/i)).toBeInTheDocument()
    })
  })

  it('shows raw config content', async () => {
    const mockData = {
      config: {
        id: '123',
        slug: 'test-config',
        title: 'Test Config',
        content: 'htop_version=3.2.1\ncolor_scheme=5',
        sourceType: 'uploaded',
        sourceUrl: null,
        sourcePlatform: null,
        status: 'published',
        score: 15,
        likesCount: 5,
        createdAt: '2026-01-14T00:00:00Z',
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText(/Raw Config/i)).toBeInTheDocument()
    })
  })
})
