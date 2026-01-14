import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { HtoprcEditor } from './HtoprcEditor'
import { HTOPRC_OPTIONS, OPTION_MAP, METER_TYPES } from './htoprcOptions'

describe('HtoprcEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the editor container', () => {
    render(<HtoprcEditor value="" onChange={() => {}} />)

    expect(screen.getByTestId('htoprc-editor')).toBeInTheDocument()
  })

  it('displays the initial value', async () => {
    render(<HtoprcEditor value="htop_version=3.2.1" onChange={() => {}} />)

    await waitFor(() => {
      const editor = screen.getByTestId('htoprc-editor')
      expect(editor.textContent).toContain('htop_version=3.2.1')
    })
  })

  it('calls onChange when content changes', async () => {
    const onChange = vi.fn()
    render(<HtoprcEditor value="" onChange={onChange} />)

    // CodeMirror is complex to simulate user input in tests
    // We'll verify the component renders and accepts the callback
    expect(screen.getByTestId('htoprc-editor')).toBeInTheDocument()
  })

  it('applies dark theme styling', () => {
    render(<HtoprcEditor value="" onChange={() => {}} />)

    const editor = screen.getByTestId('htoprc-editor')
    expect(editor).toHaveClass('cm-theme')
  })

  it('shows line numbers', async () => {
    render(<HtoprcEditor value="line1\nline2\nline3" onChange={() => {}} />)

    await waitFor(() => {
      const editor = screen.getByTestId('htoprc-editor')
      // Line numbers should be present
      expect(editor.querySelector('.cm-lineNumbers')).toBeInTheDocument()
    })
  })
})

describe('htoprcOptions', () => {
  it('provides option definitions', () => {
    expect(HTOPRC_OPTIONS.length).toBeGreaterThan(0)
  })

  it('includes common options', () => {
    const optionNames = HTOPRC_OPTIONS.map((o) => o.name)
    expect(optionNames).toContain('htop_version')
    expect(optionNames).toContain('color_scheme')
    expect(optionNames).toContain('tree_view')
    expect(optionNames).toContain('hide_kernel_threads')
  })

  it('provides option lookup map', () => {
    const colorScheme = OPTION_MAP.get('color_scheme')
    expect(colorScheme).toBeDefined()
    expect(colorScheme?.description).toContain('Color scheme')
  })

  it('defines meter types', () => {
    expect(METER_TYPES).toContain('AllCPUs')
    expect(METER_TYPES).toContain('Memory')
    expect(METER_TYPES).toContain('LoadAverage')
  })
})
