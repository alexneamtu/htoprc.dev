import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { HtoprcEditor } from '../components/editor'
import { parseHtoprc } from '@htoprc/parser'

const STORAGE_KEY = 'htoprc-editor-content'

const DEFAULT_HTOPRC = `# htoprc configuration
# Edit this config and see the preview update in real-time

htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
color_scheme=0
tree_view=0
header_layout=two_50_50
column_meters_0=AllCPUs Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=Tasks LoadAverage Uptime
column_meter_modes_1=2 2 2
hide_kernel_threads=1
hide_userland_threads=0
highlight_base_name=0
highlight_megabytes=1
highlight_threads=1
`

function useLocalStorage(key: string, initialValue: string): [string, (value: string) => void] {
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

export function EditorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [content, setContent] = useLocalStorage(STORAGE_KEY, DEFAULT_HTOPRC)
  const [debouncedContent, setDebouncedContent] = useState(content)

  // Load content from URL parameter if present
  useEffect(() => {
    const urlContent = searchParams.get('content')
    if (urlContent) {
      setContent(urlContent)
      // Clear the URL parameter to avoid reloading on refresh
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setContent, setSearchParams])

  // Debounce parsing for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(content)
    }, 100)
    return () => clearTimeout(timer)
  }, [content])

  const parsed = useMemo(() => parseHtoprc(debouncedContent), [debouncedContent])

  const handleReset = useCallback(() => {
    setContent(DEFAULT_HTOPRC)
  }, [setContent])

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Editor Panel */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-bold mb-2">htoprc Editor</h2>
        <div className="flex-1">
          <HtoprcEditor value={content} onChange={setContent} />
        </div>
        {parsed.warnings.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-900/50 rounded text-yellow-300 text-sm">
            {parsed.warnings.map((w, i) => (
              <div key={i}>
                Line {w.line}: {w.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Preview</h2>
          <span className="text-sm text-gray-500">
            Score: {parsed.score} | Version: {parsed.version}
          </span>
        </div>
        <div className="flex-1 rounded-lg p-4 overflow-auto border border-gray-300 dark:border-gray-700 bg-black">
          <HtopPreview config={parsed.config} />
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigator.clipboard.writeText(content)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Copy Config
            </button>
            <button
              onClick={() => {
                const blob = new Blob([content], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = '.htoprc'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Download .htoprc
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono border border-gray-200 dark:border-transparent">
            <div className="mb-2 text-gray-900 dark:text-gray-300 font-semibold">Install instructions:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all text-gray-700 dark:text-gray-300">mkdir -p ~/.config/htop && cat &gt; ~/.config/htop/htoprc</code>
              <button
                onClick={() => navigator.clipboard.writeText('mkdir -p ~/.config/htop && cat > ~/.config/htop/htoprc')}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-xs shrink-0 text-gray-900 dark:text-white"
                title="Copy command"
              >
                Copy
              </button>
            </div>
            <div className="mt-2 text-gray-500">Then paste your config and press Ctrl+D</div>
          </div>
        </div>
      </div>
    </div>
  )
}
