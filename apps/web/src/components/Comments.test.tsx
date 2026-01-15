import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe } from 'wonka'
import { Comments } from './Comments'

// Mock urql client
function createMockClient() {
  return {
    executeQuery: vi.fn(() =>
      pipe(
        fromValue({ data: {} }),
        delay(0)
      )
    ),
    executeMutation: vi.fn(() =>
      pipe(
        fromValue({ data: {} }),
        delay(0)
      )
    ),
    executeSubscription: vi.fn(),
  }
}

// Mock auth service
vi.mock('../services/auth', () => ({
  useAuth: () => ({
    user: null,
    isSignedIn: false,
  }),
}))

describe('Comments', () => {
  const mockComments = [
    {
      id: '1',
      content: 'Great config!',
      author: {
        id: 'user-1',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      createdAt: '2026-01-14T12:00:00Z',
    },
    {
      id: '2',
      content: 'Thanks for sharing!',
      author: {
        id: 'user-2',
        username: 'anotheruser',
        avatarUrl: null,
      },
      createdAt: '2026-01-15T08:00:00Z',
    },
  ]

  it('renders comment count', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} />
      </Provider>
    )

    expect(screen.getByText('Comments (2)')).toBeInTheDocument()
  })

  it('renders comments with content', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} />
      </Provider>
    )

    expect(screen.getByText('Great config!')).toBeInTheDocument()
    expect(screen.getByText('Thanks for sharing!')).toBeInTheDocument()
  })

  it('renders comment author usernames', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} />
      </Provider>
    )

    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText('anotheruser')).toBeInTheDocument()
  })

  it('renders avatar image when available', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} />
      </Provider>
    )

    const avatar = screen.getByAltText('testuser')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('renders initials when avatar is not available', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} />
      </Provider>
    )

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows empty state when no comments', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={[]} />
      </Provider>
    )

    expect(screen.getByText('Comments (0)')).toBeInTheDocument()
    expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} />
      </Provider>
    )

    expect(screen.getByText('Jan 14, 2026')).toBeInTheDocument()
    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument()
  })

  it('shows pending comments with approval badge', () => {
    const mockClient = createMockClient()
    const pendingComments = [
      {
        id: 'pending-1',
        content: 'My pending comment',
        author: {
          id: 'user-3',
          username: 'newuser',
          avatarUrl: null,
        },
        createdAt: '2026-01-15T10:00:00Z',
      },
    ]

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={mockComments} pendingComments={pendingComments} />
      </Provider>
    )

    expect(screen.getByText('My pending comment')).toBeInTheDocument()
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByText('+ 1 pending')).toBeInTheDocument()
  })

  it('shows pending comments count in header', () => {
    const mockClient = createMockClient()
    const pendingComments = [
      {
        id: 'pending-1',
        content: 'Comment 1',
        author: { id: 'user-3', username: 'user1', avatarUrl: null },
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: 'pending-2',
        content: 'Comment 2',
        author: { id: 'user-4', username: 'user2', avatarUrl: null },
        createdAt: '2026-01-15T11:00:00Z',
      },
    ]

    render(
      <Provider value={mockClient as never}>
        <Comments configId="config-1" comments={[]} pendingComments={pendingComments} />
      </Provider>
    )

    expect(screen.getByText('+ 2 pending')).toBeInTheDocument()
  })
})
