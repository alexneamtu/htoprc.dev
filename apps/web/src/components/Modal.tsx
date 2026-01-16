import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
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
