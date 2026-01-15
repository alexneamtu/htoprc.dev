import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'urql'
import { HtopPreview } from '../components/htop/HtopPreview'
import { SEO } from '../components/SEO'
import { parseHtoprc } from '@htoprc/parser'

const UPLOAD_CONFIG_MUTATION = /* GraphQL */ `
  mutation UploadConfig($input: UploadConfigInput!) {
    uploadConfig(input: $input) {
      id
      slug
      title
    }
  }
`

const DEFAULT_HTOPRC = `# Paste your htoprc here or upload a file
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
`

export function UploadPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState(DEFAULT_HTOPRC)
  const [error, setError] = useState<string | null>(null)

  const [uploadResult, uploadConfig] = useMutation(UPLOAD_CONFIG_MUTATION)

  const parsed = useMemo(() => parseHtoprc(content), [content])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      if (typeof text === 'string') {
        setContent(text)
        // Use filename (without extension) as title if not set
        if (!title) {
          const name = file.name.replace(/^\./, '').replace(/\.[^.]+$/, '')
          setTitle(name || 'My Config')
        }
      }
    }
    reader.readAsText(file)
  }, [title])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    if (!content.trim()) {
      setError('Please enter or upload a config')
      return
    }

    const result = await uploadConfig({ input: { title: title.trim(), content } })

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (result.data?.uploadConfig?.slug) {
      navigate(`/config/${result.data.uploadConfig.slug}`)
    }
  }, [title, content, uploadConfig, navigate])

  return (
    <div className="max-w-4xl mx-auto">
      <SEO
        title="Upload Config"
        description="Share your htop configuration with the community. Upload your htoprc file and let others discover and use your setup."
        url="/upload"
      />
      <h1 className="text-3xl font-bold mb-6">Upload Config</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome htop Config"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Config Content
          </label>
          <div className="flex gap-4 mb-2">
            <label className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md cursor-pointer text-sm">
              Upload File
              <input
                type="file"
                accept=".htoprc,text/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 font-mono text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Preview (Score: {parsed.score})
          </label>
          <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-black p-4">
            <HtopPreview config={parsed.config} />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded-md text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={uploadResult.fetching}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md"
          >
            {uploadResult.fetching ? 'Uploading...' : 'Upload Config'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
