import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal, ModalActions, ModalButton } from './Modal'

describe('Modal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('has role="dialog" and aria-modal="true"', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('has aria-labelledby linking to the title', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()

    const title = document.getElementById(labelledBy!)
    expect(title).toHaveTextContent('Test Modal')
  })

  it('closes when clicking the backdrop', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside the modal content', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <button>Inside Button</button>
      </Modal>
    )

    fireEvent.click(screen.getByText('Inside Button'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes when pressing Escape key', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('focuses the first focusable element when opened', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <button data-testid="first-button">First</button>
        <button data-testid="second-button">Second</button>
      </Modal>
    )

    expect(screen.getByTestId('first-button')).toHaveFocus()
  })

  it('focuses the modal itself when no focusable elements exist', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Just text content</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  describe('focus trap', () => {
    it('traps focus within the modal when tabbing forward', async () => {
      const user = userEvent.setup()

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <button data-testid="first-button">First</button>
          <button data-testid="second-button">Second</button>
        </Modal>
      )

      expect(screen.getByTestId('first-button')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('second-button')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('first-button')).toHaveFocus()
    })

    it('traps focus within the modal when tabbing backward', async () => {
      const user = userEvent.setup()

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <button data-testid="first-button">First</button>
          <button data-testid="second-button">Second</button>
        </Modal>
      )

      expect(screen.getByTestId('first-button')).toHaveFocus()

      await user.tab({ shift: true })
      expect(screen.getByTestId('second-button')).toHaveFocus()
    })
  })

  describe('focus restoration', () => {
    let triggerButton: HTMLButtonElement

    beforeEach(() => {
      triggerButton = document.createElement('button')
      triggerButton.textContent = 'Open Modal'
      document.body.appendChild(triggerButton)
      triggerButton.focus()
    })

    afterEach(() => {
      document.body.removeChild(triggerButton)
    })

    it('returns focus to trigger element when modal closes', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <button>Inside</button>
        </Modal>
      )

      rerender(
        <Modal isOpen={false} onClose={onClose} title="Test Modal">
          <button>Inside</button>
        </Modal>
      )

      expect(triggerButton).toHaveFocus()
    })
  })
})

describe('ModalActions', () => {
  it('renders children in a flex container', () => {
    render(
      <ModalActions>
        <button>Action 1</button>
        <button>Action 2</button>
      </ModalActions>
    )

    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
  })
})

describe('ModalButton', () => {
  it('renders with default secondary variant', () => {
    render(<ModalButton onClick={() => {}}>Cancel</ModalButton>)

    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button).toBeInTheDocument()
  })

  it('renders with primary variant', () => {
    render(
      <ModalButton onClick={() => {}} variant="primary">
        Submit
      </ModalButton>
    )

    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button.className).toContain('bg-blue-600')
  })

  it('renders with danger variant', () => {
    render(
      <ModalButton onClick={() => {}} variant="danger">
        Delete
      </ModalButton>
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button.className).toContain('bg-red-600')
  })

  it('can be disabled', () => {
    render(
      <ModalButton onClick={() => {}} disabled>
        Disabled
      </ModalButton>
    )

    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ModalButton onClick={onClick}>Click Me</ModalButton>)

    fireEvent.click(screen.getByRole('button', { name: 'Click Me' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
