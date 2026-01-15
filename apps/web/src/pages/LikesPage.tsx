import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { HtopPreview } from '../components/htop/HtopPreview'
import { SEO } from '../components/SEO'
import { parseHtoprc } from '@htoprc/parser'
import { useLikedConfigs } from '../hooks'

export function LikesPage() {
  const { user, isLoaded } = useUser()
  const { data, fetching, error } = useLikedConfigs(user?.id)

  if (!isLoaded) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Please sign in to see your liked configs.</p>
      </div>
    )
  }

  return (
    <div>
      <SEO
        title="My Likes"
        description="Your liked htop configurations"
        url="/likes"
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Likes</h1>
      </div>

      {fetching && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-gray-400">Loading your liked configs...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400">Error loading configs: {error.message}</p>
        </div>
      )}

      {data && data.likedConfigs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">You haven't liked any configs yet.</p>
          <Link
            to="/gallery"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
          >
            Browse Gallery
          </Link>
        </div>
      )}

      {data && data.likedConfigs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.likedConfigs.map((config) => {
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
    </div>
  )
}
