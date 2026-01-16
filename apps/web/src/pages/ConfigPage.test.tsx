import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'urql'
import { HelmetProvider } from 'react-helmet-async'
import { fromValue, delay, pipe } from 'wonka'
import { ConfigPage } from './ConfigPage'

// Mock Clerk hooks
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: null, isLoaded: true }),
  useAuth: () => ({ isSignedIn: false }),
  useClerk: () => ({ openSignIn: vi.fn(), signOut: vi.fn() }),
}))

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
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Config' })).toBeInTheDocument()
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
        comments: [],
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
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText(/Raw Config/i)).toBeInTheDocument()
    })
  })

  it('shows source link when sourceUrl is present', async () => {
    const mockData = {
      config: {
        id: '123',
        slug: 'scraped-config',
        title: 'Scraped Config',
        content: 'htop_version=3.2.1',
        sourceType: 'scraped',
        sourceUrl: 'https://github.com/example/dotfiles',
        sourcePlatform: 'github',
        status: 'published',
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/scraped-config')

    await waitFor(() => {
      const sourceLink = screen.getByText('View original source')
      expect(sourceLink).toBeInTheDocument()
      expect(sourceLink).toHaveAttribute('href', 'https://github.com/example/dotfiles')
    })
  })

  it('shows source type when sourceUrl is not present', async () => {
    const mockData = {
      config: {
        id: '123',
        slug: 'uploaded-config',
        title: 'Uploaded Config',
        content: 'htop_version=3.2.1',
        sourceType: 'uploaded',
        sourceUrl: null,
        sourcePlatform: null,
        status: 'published',
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/uploaded-config')

    await waitFor(() => {
      expect(screen.getByText(/Source: uploaded/)).toBeInTheDocument()
    })
  })

  it('shows forked from link when config is forked', async () => {
    const mockData = {
      config: {
        id: '123',
        slug: 'forked-config',
        title: 'Forked Config',
        content: 'htop_version=3.2.1',
        sourceType: 'uploaded',
        sourceUrl: null,
        sourcePlatform: null,
        status: 'published',
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
        forkedFrom: {
          slug: 'original-config',
          title: 'Original Config',
        },
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/forked-config')

    await waitFor(() => {
      expect(screen.getByText(/Forked from "Original Config"/)).toBeInTheDocument()
    })
  })

  it('has Fork button', async () => {
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
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText('Fork')).toBeInTheDocument()
    })
  })

  it('has Copy Config button', async () => {
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
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText('Copy Config')).toBeInTheDocument()
    })
  })

  it('has Share button', async () => {
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
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
  })

  it('displays comments section', async () => {
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
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [
          {
            id: 'comment-1',
            content: 'Great config!',
            author: { id: 'user-1', username: 'testuser', avatarUrl: null },
            createdAt: '2026-01-14T10:00:00Z',
          },
        ],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByText('Comments (1)')).toBeInTheDocument()
      expect(screen.getByText('Great config!')).toBeInTheDocument()
    })
  })

  it('has breadcrumb navigation', async () => {
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
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Gallery' })).toBeInTheDocument()
    })
  })

  it('shows score tooltip', async () => {
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
        score: 10,
        likesCount: 3,
        createdAt: '2026-01-14T00:00:00Z',
        comments: [],
      },
    }

    const mockClient = createMockClient(mockData)
    renderWithProviders(mockClient, '/config/test-config')

    await waitFor(() => {
      const scoreElement = screen.getByText(/Score: 10/)
      expect(scoreElement).toHaveAttribute('title', expect.stringContaining('Customization score'))
    })
  })
})
