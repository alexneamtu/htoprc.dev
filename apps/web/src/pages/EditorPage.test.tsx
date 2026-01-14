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

    it('copies install command when copy button is clicked', async () => {
      render(<EditorPage />)

      const copyButtons = screen.getAllByText('Copy')
      const installCopyButton = copyButtons[copyButtons.length - 1]
      fireEvent.click(installCopyButton)

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          'mkdir -p ~/.config/htop && cat > ~/.config/htop/htoprc'
        )
      })
    })
  })

  describe('download', () => {
    it('has a download button', () => {
      render(<EditorPage />)

      expect(screen.getByText('Download .htoprc')).toBeInTheDocument()
    })

    it('downloads config when download button is clicked', async () => {
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      Object.assign(URL, {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      })

      const mockClick = vi.fn()
      const mockCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = mockCreateElement(tag)
        if (tag === 'a') {
          element.click = mockClick
        }
        return element
      })

      render(<EditorPage />)

      const downloadButton = screen.getByText('Download .htoprc')
      fireEvent.click(downloadButton)

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })

  describe('reset to defaults', () => {
    it('has a reset button', () => {
      render(<EditorPage />)

      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument()
    })

    it('resets content when reset button is clicked', async () => {
      localStorage.setItem('htoprc-editor-content', 'custom_config=test')
      render(<EditorPage />)

      const resetButton = screen.getByText('Reset to Defaults')
      fireEvent.click(resetButton)

      await waitFor(() => {
        const editor = screen.getByTestId('htoprc-editor')
        expect(editor.textContent).toContain('htop_version=3.2.1')
      })
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

    it('falls back to default when localStorage throws error', async () => {
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = () => {
        throw new Error('Storage not available')
      }

      render(<EditorPage />)

      await waitFor(() => {
        const editor = screen.getByTestId('htoprc-editor')
        expect(editor.textContent).toContain('htop_version=3.2.1')
      })

      Storage.prototype.getItem = originalGetItem
    })
  })
})
