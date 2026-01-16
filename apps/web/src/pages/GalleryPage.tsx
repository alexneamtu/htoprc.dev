import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { SEO } from '../components/SEO'
import { parseHtoprc } from '@htoprc/parser'
import { useConfigs, type ConfigSort, type CustomizationLevel } from '../hooks'

const SORT_OPTIONS: { value: ConfigSort; label: string }[] = [
  { value: 'SCORE_DESC', label: 'Highest Score' },
  { value: 'LIKES_DESC', label: 'Most Liked' },
  { value: 'CREATED_DESC', label: 'Newest' },
  { value: 'CREATED_ASC', label: 'Oldest' },
]

const LEVEL_OPTIONS: { value: CustomizationLevel; label: string }[] = [
  { value: 'ALL', label: 'All Levels' },
  { value: 'MINIMAL', label: 'Minimal' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HEAVY', label: 'Heavy' },
]

export function GalleryPage() {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ConfigSort>('SCORE_DESC')
  const [level, setLevel] = useState<CustomizationLevel>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, fetching, error } = useConfigs({ limit: 12, page, sort, search: debouncedSearch, level })

  return (
    <div>
      <SEO
        title="Gallery"
        description="Browse the complete collection of htop configurations. Search, filter, and find the perfect htop setup."
        url="/gallery"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search configs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 pl-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="level" className="text-sm text-gray-500 dark:text-gray-400">
              Level:
            </label>
            <select
              id="level"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value as CustomizationLevel)
                setPage(1)
              }}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-500 dark:text-gray-400">
              Sort:
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
      </div>

      <p className="text-gray-600 dark:text-gray-400 max-w-2xl mb-6">
        Browse htop themes and configs from the community. New to htoprc? Start with{' '}
        <Link to="/what-is-htoprc" className="text-blue-600 dark:text-blue-400 hover:underline">
          what is an htoprc
        </Link>
        , then try the{' '}
        <Link
          to="/htop-config-quick-guide"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          quick guide
        </Link>
        .
      </p>

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
          {debouncedSearch ? (
            <>
              <p className="text-gray-400">No configs found matching "{debouncedSearch}"</p>
              <button
                onClick={() => setSearch('')}
                className="mt-4 inline-block px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400">No configs found. Be the first to upload one!</p>
              <Link
                to="/editor"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
              >
                Create Config
              </Link>
            </>
          )}
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
    </div>
  )
}
