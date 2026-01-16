import { useState, useCallback } from 'react'

export function useLocalStorage(key: string, initialValue: string): [string, (value: string) => void] {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ?? initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: string) => {
    setStoredValue(value)
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore storage errors
    }
  }, [key])

  return [storedValue, setValue]
}
