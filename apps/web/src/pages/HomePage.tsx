import { Link } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { SEO } from '../components/SEO'
import { parseHtoprc } from '@htoprc/parser'
import { useTopConfigs, useRecentConfigs } from '../hooks'

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

function RecentlyAdded() {
  const { data, fetching } = useRecentConfigs(6)

  if (fetching || !data || data.recentConfigs.length === 0) {
    return null
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recently Added</h2>
        <Link
          to="/gallery"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.recentConfigs.map((config) => {
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
    </section>
  )
}

export function HomePage() {
  return (
    <div>
      <SEO url="/" />
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">htoprc.dev</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Browse, preview, and share htop configurations
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/gallery"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold"
          >
            Browse Gallery
          </Link>
          <Link
            to="/editor"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-semibold"
          >
            Create Config
          </Link>
        </div>
      </section>

      <section className="mb-12 max-w-3xl mx-auto text-gray-600 dark:text-gray-400">
        <p className="text-lg">
          htoprc.dev is a visual htop configuration editor. Learn the basics in our{' '}
          <Link to="/what-is-htoprc" className="text-blue-600 dark:text-blue-400 hover:underline">
            what is an htoprc file guide
          </Link>
          , then customize your layout with the{' '}
          <Link to="/customize-htop" className="text-blue-600 dark:text-blue-400 hover:underline">
            colors, meters, and columns guide
          </Link>
          .
        </p>
      </section>

      <HeroConfig />

      <RecentlyAdded />
    </div>
  )
}
