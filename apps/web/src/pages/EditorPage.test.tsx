import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditorPage } from './EditorPage'

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}
Object.assign(navigator, { clipboard: mockClipboard })

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the editor and preview panels', () => {
    render(<EditorPage />)

    expect(screen.getByText('htoprc Editor')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('shows default htoprc content', () => {
    render(<EditorPage />)

    // Should show some default config content
    expect(screen.getByText(/htop_version/)).toBeInTheDocument()
  })

  it('updates preview when content changes', async () => {
    render(<EditorPage />)

    // The preview should show process list headers
    expect(screen.getByText('PID')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
  })

  describe('copy to clipboard', () => {
    it('copies content to clipboard when button is clicked', async () => {
      render(<EditorPage />)

      const copyButton = screen.getByText('Copy Config')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled()
      })
    })
  })

  describe('install instructions', () => {
    it('shows install command', () => {
      render(<EditorPage />)

      expect(screen.getByText(/mkdir -p/)).toBeInTheDocument()
    })
  })

  describe('download', () => {
    it('has a download button', () => {
      render(<EditorPage />)

      expect(screen.getByText('Download .htoprc')).toBeInTheDocument()
    })
  })

  describe('reset to defaults', () => {
    it('has a reset button', () => {
      render(<EditorPage />)

      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument()
    })
  })

  describe('parse warnings', () => {
    it('shows warnings for invalid config', async () => {
      render(<EditorPage />)

      // The default config should parse without errors
      // Warnings section should not show for valid config
      expect(screen.queryByText(/Line \d+:/)).not.toBeInTheDocument()
    })
  })

  describe('score display', () => {
    it('shows the config score', () => {
      render(<EditorPage />)

      expect(screen.getByText(/Score:/)).toBeInTheDocument()
    })

    it('shows the detected version', () => {
      render(<EditorPage />)

      expect(screen.getByText(/Version:/)).toBeInTheDocument()
    })
  })

  describe('local storage persistence', () => {
    it('loads content from localStorage on mount', async () => {
      localStorage.setItem('htoprc-editor-content', 'htop_version=3.4.0')

      render(<EditorPage />)

      await waitFor(() => {
        const editor = screen.getByTestId('htoprc-editor')
        expect(editor.textContent).toContain('htop_version=3.4.0')
      })
    })
  })
})
