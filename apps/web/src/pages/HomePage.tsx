import { Link } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { parseHtoprc } from '@htoprc/parser'
import { useConfigs } from '../hooks'

export function HomePage() {
  const { data, fetching, error } = useConfigs({ limit: 12 })

  return (
    <div>
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">htoprc.dev</h1>
        <p className="text-xl text-gray-400 dark:text-gray-400 mb-8">
          Browse, preview, and share htop configurations
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Gallery</h2>

        {fetching && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-gray-400">Loading configs...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400">Error loading configs: {error.message}</p>
          </div>
        )}

        {data && data.configs.nodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No configs found. Be the first to upload one!</p>
            <Link
              to="/editor"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Create Config
            </Link>
          </div>
        )}

        {data && data.configs.nodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.configs.nodes.map((config) => {
              const parsed = parseHtoprc(config.content)
              return (
                <Link
                  key={config.id}
                  to={`/config/${config.slug}`}
                  className="block bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <div className="p-3">
                    <div className="aspect-video overflow-hidden rounded bg-black">
                      <HtopPreview config={parsed.config} />
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <h3 className="font-semibold text-lg truncate">{config.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span>Score: {config.score}</span>
                      <span>Likes: {config.likesCount}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {data && data.configs.pageInfo.totalPages > 1 && (
          <div className="mt-8 text-center text-gray-400">
            Page {data.configs.pageInfo.page} of {data.configs.pageInfo.totalPages} ({data.configs.totalCount} total)
          </div>
        )}
      </section>
    </div>
  )
}
