import { useState } from 'react'
import { useQuery, useMutation } from 'urql'
import { Navigate } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { HtopPreview } from '../components/htop/HtopPreview'
import { parseHtoprc } from '@htoprc/parser'
import { useAuth } from '../services/auth'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const ADMIN_STATS_QUERY = /* GraphQL */ `
  query AdminStats {
    adminStats {
      totalConfigs
      publishedConfigs
      pendingConfigs
      totalComments
      pendingComments
      totalLikes
    }
  }
`

const PENDING_CONFIGS_QUERY = /* GraphQL */ `
  query PendingConfigs {
    pendingConfigs {
      id
      slug
      title
      content
      score
      createdAt
    }
  }
`

const PENDING_COMMENTS_QUERY = /* GraphQL */ `
  query PendingComments {
    pendingComments {
      id
      content
      configId
      configTitle
      authorId
      authorUsername
      createdAt
    }
  }
`

const APPROVE_CONFIG_MUTATION = /* GraphQL */ `
  mutation ApproveConfig($id: ID!) {
    approveConfig(id: $id) {
      id
      status
    }
  }
`

const REJECT_CONFIG_MUTATION = /* GraphQL */ `
  mutation RejectConfig($id: ID!, $reason: String!) {
    rejectConfig(id: $id, reason: $reason) {
      id
      status
    }
  }
`

const APPROVE_COMMENT_MUTATION = /* GraphQL */ `
  mutation ApproveComment($id: ID!) {
    approveComment(id: $id) {
      id
    }
  }
`

const REJECT_COMMENT_MUTATION = /* GraphQL */ `
  mutation RejectComment($id: ID!, $reason: String!) {
    rejectComment(id: $id, reason: $reason)
  }
`

interface AdminStats {
  totalConfigs: number
  publishedConfigs: number
  pendingConfigs: number
  totalComments: number
  pendingComments: number
  totalLikes: number
}

interface PendingConfig {
  id: string
  slug: string
  title: string
  content: string
  score: number
  createdAt: string
}

interface PendingComment {
  id: string
  content: string
  configId: string
  configTitle: string
  authorId: string
  authorUsername: string
  createdAt: string
}

type Tab = 'stats' | 'configs' | 'comments'

export function AdminPage() {
  const auth = CLERK_ENABLED ? useAuth() : { isSignedIn: false, isLoaded: true, user: null }
  const [activeTab, setActiveTab] = useState<Tab>('stats')

  const [statsResult] = useQuery<{ adminStats: AdminStats }>({ query: ADMIN_STATS_QUERY })
  const [configsResult, refetchConfigs] = useQuery<{ pendingConfigs: PendingConfig[] }>({
    query: PENDING_CONFIGS_QUERY,
    pause: activeTab !== 'configs',
  })
  const [commentsResult, refetchComments] = useQuery<{ pendingComments: PendingComment[] }>({
    query: PENDING_COMMENTS_QUERY,
    pause: activeTab !== 'comments',
  })

  const [, approveConfig] = useMutation(APPROVE_CONFIG_MUTATION)
  const [, rejectConfig] = useMutation(REJECT_CONFIG_MUTATION)
  const [, approveComment] = useMutation(APPROVE_COMMENT_MUTATION)
  const [, rejectComment] = useMutation(REJECT_COMMENT_MUTATION)

  // In production, check if user is admin
  // For now, just require authentication
  if (!auth.isLoaded) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!auth.isSignedIn) {
    return <Navigate to="/" replace />
  }

  const stats = statsResult.data?.adminStats

  const handleApproveConfig = async (id: string) => {
    await approveConfig({ id })
    refetchConfigs({ requestPolicy: 'network-only' })
  }

  const handleRejectConfig = async (id: string) => {
    const reason = prompt('Rejection reason:')
    if (reason) {
      await rejectConfig({ id, reason })
      refetchConfigs({ requestPolicy: 'network-only' })
    }
  }

  const handleApproveComment = async (id: string) => {
    await approveComment({ id })
    refetchComments({ requestPolicy: 'network-only' })
  }

  const handleRejectComment = async (id: string) => {
    const reason = prompt('Rejection reason:')
    if (reason) {
      await rejectComment({ id, reason })
      refetchComments({ requestPolicy: 'network-only' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <SEO title="Admin Dashboard" url="/admin" />
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'stats'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Stats
        </button>
        <button
          onClick={() => setActiveTab('configs')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'configs'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Configs ({stats?.pendingConfigs ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'comments'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Comments ({stats?.pendingComments ?? 0})
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Configs" value={stats?.totalConfigs ?? 0} />
          <StatCard label="Published" value={stats?.publishedConfigs ?? 0} />
          <StatCard label="Pending Review" value={stats?.pendingConfigs ?? 0} color="yellow" />
          <StatCard label="Total Comments" value={stats?.totalComments ?? 0} />
          <StatCard label="Pending Comments" value={stats?.pendingComments ?? 0} color="yellow" />
          <StatCard label="Total Likes" value={stats?.totalLikes ?? 0} color="red" />
        </div>
      )}

      {/* Pending Configs Tab */}
      {activeTab === 'configs' && (
        <div className="space-y-6">
          {configsResult.fetching && <p>Loading...</p>}
          {configsResult.data?.pendingConfigs.length === 0 && (
            <p className="text-gray-500">No pending configs.</p>
          )}
          {configsResult.data?.pendingConfigs.map((config) => {
            const parsed = parseHtoprc(config.content)
            return (
              <div
                key={config.id}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{config.title}</h3>
                    <p className="text-sm text-gray-500">
                      Score: {config.score} | {new Date(config.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveConfig(config.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectConfig(config.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden bg-black p-2">
                  <HtopPreview config={parsed.config} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pending Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {commentsResult.fetching && <p>Loading...</p>}
          {commentsResult.data?.pendingComments.length === 0 && (
            <p className="text-gray-500">No pending comments.</p>
          )}
          {commentsResult.data?.pendingComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">{comment.authorUsername}</span> on{' '}
                    <span className="font-medium">{comment.configTitle}</span>
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApproveComment(comment.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectComment(comment.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color = 'blue',
}: {
  label: string
  value: number
  color?: 'blue' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  }

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}
