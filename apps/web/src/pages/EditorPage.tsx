import { useState, useMemo } from 'react'
import { HtopPreview } from '../components/htop/HtopPreview'
import { parseHtoprc } from '@htoprc/parser'

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

export function EditorPage() {
  const [content, setContent] = useState(DEFAULT_HTOPRC)

  const parsed = useMemo(() => parseHtoprc(content), [content])

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Editor Panel */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-bold mb-2">htoprc Editor</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-lg resize-none border border-gray-700 focus:border-blue-500 focus:outline-none"
          placeholder="Paste your htoprc config here..."
          spellCheck={false}
        />
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
        <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto">
          <HtopPreview config={parsed.config} />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={() => {
              const blob = new Blob([content], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'htoprc'
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Download .htoprc
          </button>
        </div>
      </div>
    </div>
  )
}
