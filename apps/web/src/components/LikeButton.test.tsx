import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue, delay, pipe } from 'wonka'
import { LikeButton } from './LikeButton'

// Mock urql client
function createMockClient() {
  return {
    executeQuery: vi.fn(() =>
      pipe(
        fromValue({ data: { hasLiked: false } }),
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

describe('LikeButton', () => {
  it('renders like count', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <LikeButton configId="config-1" initialLikesCount={5} />
      </Provider>
    )

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders heart icon', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <LikeButton configId="config-1" initialLikesCount={10} />
      </Provider>
    )

    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders in small size', () => {
    const mockClient = createMockClient()

    const { container } = render(
      <Provider value={mockClient as never}>
        <LikeButton configId="config-1" initialLikesCount={3} size="sm" />
      </Provider>
    )

    expect(container.querySelector('.text-xs')).toBeInTheDocument()
  })

  it('renders in medium size by default', () => {
    const mockClient = createMockClient()

    const { container } = render(
      <Provider value={mockClient as never}>
        <LikeButton configId="config-1" initialLikesCount={3} />
      </Provider>
    )

    expect(container.querySelector('.text-sm')).toBeInTheDocument()
  })

  it('renders with zero likes', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <LikeButton configId="config-1" initialLikesCount={0} />
      </Provider>
    )

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders multiple digits correctly', () => {
    const mockClient = createMockClient()

    render(
      <Provider value={mockClient as never}>
        <LikeButton configId="config-1" initialLikesCount={1234} />
      </Provider>
    )

    expect(screen.getByText('1234')).toBeInTheDocument()
  })
})
