import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { HtopPreview } from '../components/htop/HtopPreview'
import { LikeButton } from '../components/LikeButton'
import { Comments } from '../components/Comments'
import { SEO } from '../components/SEO'
import { parseHtoprc } from '@htoprc/parser'
import { useConfig } from '../hooks'
import { useMutation, useQuery } from 'urql'
import { useAuth } from '../services/auth'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const REPORT_MUTATION = /* GraphQL */ `
  mutation ReportContent($contentType: String!, $contentId: ID!, $reason: String!, $userId: ID!) {
    reportContent(contentType: $contentType, contentId: $contentId, reason: $reason, userId: $userId)
  }
`

const DELETE_CONFIG_MUTATION = /* GraphQL */ `
  mutation DeleteConfig($id: ID!, $userId: ID!) {
    deleteConfig(id: $id, userId: $userId)
  }
`

const IS_ADMIN_QUERY = /* GraphQL */ `
  query IsAdmin($userId: ID!) {
    isAdmin(userId: $userId)
  }
`

const MY_PENDING_COMMENTS_QUERY = /* GraphQL */ `
  query MyPendingComments($configId: ID!, $userId: ID!) {
    myPendingComments(configId: $configId, userId: $userId) {
      id
      content
      author {
        id
        username
        avatarUrl
      }
      createdAt
    }
  }
`

export function ConfigPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, fetching, error } = useConfig({ slug })
  const [, reportContent] = useMutation(REPORT_MUTATION)
  const [, deleteConfig] = useMutation(DELETE_CONFIG_MUTATION)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitted, setReportSubmitted] = useState(false)

  const auth = CLERK_ENABLED ? useAuth() : { user: null, isSignedIn: false }

  const [{ data: adminData }] = useQuery<{ isAdmin: boolean }>({
    query: IS_ADMIN_QUERY,
    variables: { userId: auth.user?.id },
    pause: !auth.user?.id,
  })

  const [{ data: pendingCommentsData }] = useQuery<{ myPendingComments: Array<{ id: string; content: string; author: { id: string; username: string; avatarUrl: string | null }; createdAt: string }> }>({
    query: MY_PENDING_COMMENTS_QUERY,
    variables: { configId: data?.config?.id, userId: auth.user?.id },
    pause: !auth.user?.id || !data?.config?.id,
  })

  const isAdmin = adminData?.isAdmin ?? false
  const pendingComments = pendingCommentsData?.myPendingComments ?? []

  const handleReport = async () => {
    if (!reportReason.trim() || !data?.config || !auth.user?.id) return
    await reportContent({
      contentType: 'config',
      contentId: data.config.id,
      reason: reportReason,
      userId: auth.user.id,
    })
    setShowReportDialog(false)
    setReportReason('')
    setReportSubmitted(true)
  }

  const handleDelete = async () => {
    if (!data?.config || !auth.user?.id) return
    const result = await deleteConfig({
      id: data.config.id,
      userId: auth.user.id,
    })
    if (!result.error) {
      // Use window.location to force a full page reload and bypass urql cache
      window.location.href = '/'
    }
  }

  const canDelete = auth.isSignedIn && (auth.user?.id === data?.config?.authorId || isAdmin)

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
        {auth.isSignedIn && (
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            If this is your first submission, it may be pending review.{' '}
            <Link to="/admin" className="text-blue-500 hover:underline">
              Check your configs
            </Link>
          </p>
        )}
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

  // JSON-LD structured data for this config
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: config.title,
    description: `htop configuration: ${config.title}. Score: ${config.score}, ${config.likesCount} likes.`,
    codeRepository: config.sourceUrl || undefined,
    programmingLanguage: 'htoprc',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: config.score,
      ratingCount: config.likesCount || 1,
      bestRating: 100,
      worstRating: 0,
    },
    datePublished: config.createdAt,
    url: `https://htoprc.dev/config/${config.slug}`,
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SEO
        title={config.title}
        description={`htop configuration: ${config.title}. Score: ${config.score}, ${config.likesCount} likes. Browse and customize this htop config.`}
        url={`/config/${config.slug}`}
        type="article"
        jsonLd={jsonLd}
      />
      <div className="mb-6">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Back to Gallery
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-4">{config.title}</h1>

      <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400 mb-6">
        <span
          title="Customization score: +10 custom color scheme, +5 tree view, +5 each meter column, +3 for >8 columns, +3 custom header layout"
          className="cursor-help border-b border-dotted border-gray-500"
        >
          Score: {config.score}
        </span>
        <LikeButton configId={config.id} initialLikesCount={config.likesCount} />
        {config.sourceUrl ? (
          <a
            href={config.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 hover:underline"
          >
            View original source
          </a>
        ) : (
          <span>Source: {config.sourceType}</span>
        )}
        {config.forkedFrom && (
          <Link to={`/config/${config.forkedFrom.slug}`} className="text-purple-500 hover:text-purple-400">
            Forked from "{config.forkedFrom.title}"
          </Link>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <HtopPreview config={parsed.config} />
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        {auth.isSignedIn && auth.user?.id === config.authorId && config.sourceType === 'uploaded' && (
          <Link
            to={`/editor?content=${encodeURIComponent(config.content)}&edit=${config.slug}`}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white"
          >
            Edit
          </Link>
        )}
        <Link
          to={`/editor?content=${encodeURIComponent(config.content)}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
        >
          Open in Editor
        </Link>
        <Link
          to={`/editor?content=${encodeURIComponent(config.content)}&fork=${config.slug}`}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white"
        >
          Fork
        </Link>
        <button
          onClick={() => navigator.clipboard.writeText(config.content)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-900 dark:text-white"
        >
          Copy Config
        </button>
        <button
          onClick={() => {
            const url = `${window.location.origin}/config/${config.slug}`
            if (navigator.share) {
              navigator.share({
                title: config.title,
                text: `Check out this htop config: ${config.title}`,
                url,
              })
            } else {
              navigator.clipboard.writeText(url)
            }
          }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-900 dark:text-white"
        >
          Share
        </button>
        {auth.isSignedIn && (
          !reportSubmitted ? (
            <button
              onClick={() => setShowReportDialog(true)}
              className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Report
            </button>
          ) : (
            <span className="px-4 py-2 text-green-600 dark:text-green-400">
              Reported
            </span>
          )
        )}
        {canDelete && (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white"
          >
            Delete
          </button>
        )}
      </div>

      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Report Config</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please describe why you're reporting this config.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              rows={3}
              placeholder="Reason for reporting..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReportDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-md text-white"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Config</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{config.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <details className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-transparent">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-900 dark:text-white">
          Raw Config
        </summary>
        <pre className="px-4 pb-4 overflow-x-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {config.content}
        </pre>
      </details>

      <Comments configId={config.id} comments={config.comments} pendingComments={pendingComments} />
    </div>
  )
}
