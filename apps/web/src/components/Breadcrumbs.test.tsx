import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Breadcrumbs } from './Breadcrumbs'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <HelmetProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </HelmetProvider>
  )
}

describe('Breadcrumbs', () => {
  it('renders Home link by default', () => {
    renderWithProviders(<Breadcrumbs items={[]} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('renders breadcrumb items', () => {
    renderWithProviders(
      <Breadcrumbs
        items={[
          { name: 'Gallery', path: '/gallery' },
          { name: 'My Config', path: '/config/my-config' },
        ]}
      />
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('My Config')).toBeInTheDocument()
  })

  it('renders links for non-final items', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ name: 'Gallery', path: '/gallery' }]} />
    )

    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).toHaveAttribute('href', '/')

    // Final item should not be a link
    const galleryText = screen.getByText('Gallery')
    expect(galleryText.tagName).not.toBe('A')
  })

  it('sets aria-current on final item', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ name: 'About', path: '/about' }]} />
    )

    const currentItem = screen.getByText('About')
    expect(currentItem).toHaveAttribute('aria-current', 'page')
  })

  it('renders separators between items', () => {
    renderWithProviders(
      <Breadcrumbs
        items={[
          { name: 'Gallery', path: '/gallery' },
          { name: 'Config', path: '/config/test' },
        ]}
      />
    )

    // Should have 2 separators (Home / Gallery / Config)
    const separators = screen.getAllByText('/')
    expect(separators).toHaveLength(2)
  })
})
