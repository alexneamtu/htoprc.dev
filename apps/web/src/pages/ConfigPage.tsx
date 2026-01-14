import { useParams, Link } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { parseHtoprc } from '@htoprc/parser'
import { useConfig } from '../hooks'

export function ConfigPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, fetching, error } = useConfig({ slug })

  if (fetching) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading config...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading config: {error.message}</p>
      </div>
    )
  }

  if (!data?.config) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Config not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          The config you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
        >
          Browse Gallery
        </Link>
      </div>
    )
  }

  const config = data.config
  const parsed = parseHtoprc(config.content)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Back to Gallery
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-4">{config.title}</h1>

      <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400 mb-6">
        <span>Score: {config.score}</span>
        <span>Likes: {config.likesCount}</span>
        <span>Source: {config.sourceType}</span>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <HtopPreview config={parsed.config} />
      </div>

      <div className="flex gap-4 mb-8">
        <Link
          to={`/editor?content=${encodeURIComponent(config.content)}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
        >
          Open in Editor
        </Link>
        <button
          onClick={() => navigator.clipboard.writeText(config.content)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-900 dark:text-white"
        >
          Copy Config
        </button>
      </div>

      <details className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-transparent">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-900 dark:text-white">
          Raw Config
        </summary>
        <pre className="px-4 pb-4 overflow-x-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {config.content}
        </pre>
      </details>
    </div>
  )
}
