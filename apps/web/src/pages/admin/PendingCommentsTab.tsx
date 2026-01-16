import { useQuery, useMutation } from 'urql'
import { Link } from 'react-router-dom'
import { PENDING_COMMENTS_QUERY } from '../../graphql/queries'
import { APPROVE_COMMENT_MUTATION, REJECT_COMMENT_MUTATION } from '../../graphql/mutations'
import type { PendingComment } from '../../graphql/types'

interface PendingCommentsTabProps {
  userId: string
}

export function PendingCommentsTab({ userId }: PendingCommentsTabProps) {
  const [result, refetch] = useQuery<{ pendingComments: PendingComment[] }>({
    query: PENDING_COMMENTS_QUERY,
    variables: { userId },
  })

  const [, approveComment] = useMutation(APPROVE_COMMENT_MUTATION)
  const [, rejectComment] = useMutation(REJECT_COMMENT_MUTATION)

  const handleApproveComment = async (id: string) => {
    await approveComment({ id, userId })
    refetch({ requestPolicy: 'network-only' })
  }

  const handleRejectComment = async (id: string) => {
    const reason = prompt('Rejection reason:')
    if (reason) {
      await rejectComment({ id, reason, userId })
      refetch({ requestPolicy: 'network-only' })
    }
  }

  if (result.fetching) {
    return <p>Loading...</p>
  }

  if (result.data?.pendingComments.length === 0) {
    return <p className="text-gray-500">No pending comments.</p>
  }

  return (
    <div className="space-y-4">
      {result.data?.pendingComments.map((comment) => (
        <div
          key={comment.id}
          className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-medium">{comment.authorUsername}</span> on{' '}
                <Link
                  to={`/config/${comment.configSlug}`}
                  className="font-medium text-blue-500 hover:underline"
                >
                  {comment.configTitle}
                </Link>
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
  )
}
