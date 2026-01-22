import { type ReactNode, useEffect, useRef, useId, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const titleId = useId()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        const firstElement = focusableElements[0] as HTMLElement | undefined
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined

        if (!firstElement || !lastElement) return

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement

      document.addEventListener('keydown', handleKeyDown)

      const focusableElements = modalRef.current?.querySelectorAll(FOCUSABLE_SELECTOR)
      const firstFocusable = focusableElements?.[0] as HTMLElement | undefined
      if (firstFocusable) {
        firstFocusable.focus()
      } else {
        modalRef.current?.focus()
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
      triggerRef.current = null
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-lg font-semibold mb-4">
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

interface ModalActionsProps {
  children: ReactNode
}

export function ModalActions({ children }: ModalActionsProps) {
  return <div className="flex justify-end gap-2">{children}</div>
}

interface ModalButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'secondary'
  children: ReactNode
}

export function ModalButton({ onClick, disabled, variant = 'secondary', children }: ModalButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-md'
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white',
    danger: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white',
    secondary: 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  )
}
