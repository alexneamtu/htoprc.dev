import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Browse our gallery of htop configurations instead."
      />
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          to="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Browse Gallery
        </Link>
        <Link
          to="/editor"
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md"
        >
          Try Editor
        </Link>
      </div>
    </div>
  )
}
