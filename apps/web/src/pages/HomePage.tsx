import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { parseHtoprc } from '@htoprc/parser'
import { useConfigs, useTopConfigs, type ConfigSort } from '../hooks'

const SORT_OPTIONS: { value: ConfigSort; label: string }[] = [
  { value: 'SCORE_DESC', label: 'Highest Score' },
  { value: 'LIKES_DESC', label: 'Most Liked' },
  { value: 'CREATED_DESC', label: 'Newest' },
  { value: 'CREATED_ASC', label: 'Oldest' },
]

function HeroConfig() {
  const { data, fetching } = useTopConfigs(1)

  if (fetching || !data || data.configs.nodes.length === 0) {
    return null
  }

  const config = data.configs.nodes[0]
  if (!config) return null

  const parsed = parseHtoprc(config.content)

  return (
    <section className="mb-12">
      <Link
        to={`/config/${config.slug}`}
        className="block bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-yellow-500 text-yellow-900 text-sm font-semibold rounded-full">
                Top Rated
              </span>
              <h3 className="font-semibold text-xl">{config.title}</h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Score: {config.score}</span>
              <span>{config.likesCount} likes</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg">
            <HtopPreview config={parsed.config} />
          </div>
        </div>
      </Link>
    </section>
  )
}

export function HomePage() {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ConfigSort>('SCORE_DESC')
  const { data, fetching, error } = useConfigs({ limit: 12, page, sort })

  return (
    <div>
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">htoprc.dev</h1>
        <p className="text-xl text-gray-400 dark:text-gray-400 mb-8">
          Browse, preview, and share htop configurations
        </p>
      </section>

      <HeroConfig />

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Gallery</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-500 dark:text-gray-400">
              Sort by:
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as ConfigSort)
                setPage(1)
              }}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                    <div className="aspect-video overflow-hidden rounded">
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
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.configs.pageInfo.hasPreviousPage}
              className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Page {data.configs.pageInfo.page} of {data.configs.pageInfo.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.configs.pageInfo.hasNextPage}
              className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
