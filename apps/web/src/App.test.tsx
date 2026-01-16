import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./lib/graphql', () => ({
  createGraphqlClient: () => ({
    executeQuery: vi.fn(),
    executeMutation: vi.fn(),
    executeSubscription: vi.fn(),
  }),
}))

vi.mock('./hooks', () => ({
  useTopConfigs: () => ({ data: { configs: { nodes: [] } }, fetching: false }),
  useRecentConfigs: () => ({ data: { recentConfigs: [] }, fetching: false }),
  useConfigs: () => ({
    data: {
      configs: {
        nodes: [],
        pageInfo: { page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      },
    },
    fetching: false,
    error: null,
  }),
  useConfig: () => ({ data: { config: null }, fetching: false, error: null }),
}))

describe('App guide routes', () => {
  it('renders the what is htoprc guide', () => {
    render(
      <MemoryRouter initialEntries={['/what-is-htoprc']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /what is an htoprc file/i })).toBeInTheDocument()
  })

  it('renders the customize htop guide', () => {
    render(
      <MemoryRouter initialEntries={['/customize-htop']}>
        <App />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', { name: /customize htop colors, meters, and columns/i })
    ).toBeInTheDocument()
  })

  it('renders the quick guide', () => {
    render(
      <MemoryRouter initialEntries={['/htop-config-quick-guide']}>
        <App />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', { name: /htop configuration quick guide/i })
    ).toBeInTheDocument()
  })
})

it('shows the home page intro copy', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByText(/visual htop configuration editor/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /what is an htoprc file/i })).toBeInTheDocument()
})

it('shows the gallery intro copy', () => {
  render(
    <MemoryRouter initialEntries={['/gallery']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByText(/browse htop themes and configs/i)).toBeInTheDocument()
})

it('shows guide links in the footer', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByRole('link', { name: /what is htoprc/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /customize htop/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /quick guide/i })).toBeInTheDocument()
})
