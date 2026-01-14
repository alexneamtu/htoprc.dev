import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark', 'light')
  })

  it('renders a toggle button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('defaults to dark mode', () => {
    render(<ThemeToggle />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles to light mode when clicked', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })

    fireEvent.click(button)

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('toggles back to dark mode on second click', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })

    fireEvent.click(button) // light
    fireEvent.click(button) // dark

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('persists theme choice to localStorage', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })

    fireEvent.click(button) // light

    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('restores theme from localStorage', () => {
    localStorage.setItem('theme', 'light')

    render(<ThemeToggle />)

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('shows sun icon in dark mode', () => {
    render(<ThemeToggle />)
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
  })

  it('shows moon icon in light mode', () => {
    localStorage.setItem('theme', 'light')
    render(<ThemeToggle />)
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
  })
})
