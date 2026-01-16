import { useQuery, useMutation } from 'urql'
import { Link } from 'react-router-dom'
import { parseHtoprc } from '@htoprc/parser'
import { HtopPreview } from '../../components/htop/HtopPreview'
import { PENDING_CONFIGS_QUERY } from '../../graphql/queries'
import { APPROVE_CONFIG_MUTATION, REJECT_CONFIG_MUTATION } from '../../graphql/mutations'
import type { Config } from '../../graphql/types'

interface PendingConfigsTabProps {
  userId: string
}

export function PendingConfigsTab({ userId }: PendingConfigsTabProps) {
  const [result, refetch] = useQuery<{ pendingConfigs: Config[] }>({
    query: PENDING_CONFIGS_QUERY,
    variables: { userId },
  })

  const [, approveConfig] = useMutation(APPROVE_CONFIG_MUTATION)
  const [, rejectConfig] = useMutation(REJECT_CONFIG_MUTATION)

  const handleApproveConfig = async (id: string) => {
    await approveConfig({ id, userId })
    refetch({ requestPolicy: 'network-only' })
  }

  const handleRejectConfig = async (id: string) => {
    const reason = prompt('Rejection reason:')
    if (reason) {
      await rejectConfig({ id, reason, userId })
      refetch({ requestPolicy: 'network-only' })
    }
  }

  if (result.fetching) {
    return <p>Loading...</p>
  }

  if (result.data?.pendingConfigs.length === 0) {
    return <p className="text-gray-500">No pending configs.</p>
  }

  return (
    <div className="space-y-6">
      {result.data?.pendingConfigs.map((config) => {
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
                <Link
                  to={`/config/${config.slug}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                >
                  View
                </Link>
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
  )
}
