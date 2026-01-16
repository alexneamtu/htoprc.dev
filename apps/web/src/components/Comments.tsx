import { useState, useCallback } from 'react'
import { useMutation } from 'urql'
import { useAuth } from '../services/auth'
import { ADD_COMMENT_MUTATION } from '../graphql/mutations'
import type { Comment } from '../graphql/types'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

interface CommentsProps {
  configId: string
  comments: Comment[]
  pendingComments?: Comment[]
}

export function Comments({ configId, comments: initialComments, pendingComments = [] }: CommentsProps) {
  // Always call hooks unconditionally (Rules of Hooks)
  const auth = useAuth()
  // Only use auth values when Clerk is enabled
  const user = CLERK_ENABLED ? auth.user : null
  const isSignedIn = CLERK_ENABLED ? auth.isSignedIn : false

  const [comments] = useState(initialComments)
  const [localPendingComments, setLocalPendingComments] = useState<(Comment & { isPending?: boolean })[]>(
    pendingComments.map(c => ({ ...c, isPending: true }))
  )
  const [newComment, setNewComment] = useState('')
  const [, addComment] = useMutation(ADD_COMMENT_MUTATION)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignedIn || !user || !newComment.trim()) return

    setIsSubmitting(true)
    setError(null)

    const result = await addComment({
      configId,
      userId: user.id,
      content: newComment.trim(),
      username: user.username || user.email?.split('@')[0] || 'User',
      avatarUrl: user.avatarUrl,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError('Failed to add comment. Please try again.')
      return
    }

    if (result.data?.addComment) {
      // Add to pending comments with pending flag (comments need approval for new users)
      setLocalPendingComments([...localPendingComments, { ...result.data.addComment, isPending: true }])
      setNewComment('')
    }
  }, [isSignedIn, user, newComment, configId, addComment, localPendingComments])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Combine published comments with user's pending comments
  const allComments = [
    ...comments.map(c => ({ ...c, isPending: false })),
    ...localPendingComments,
  ]

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">
        Comments ({comments.length})
        {localPendingComments.length > 0 && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            + {localPendingComments.length} pending
          </span>
        )}
      </h2>

      {allComments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {allComments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg p-4 ${
                comment.isPending
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {comment.author.avatarUrl ? (
                  <img
                    src={comment.author.avatarUrl}
                    alt={comment.author.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium">
                    {comment.author.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.author.username}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {formatDate(comment.createdAt)}
                  </span>
                  {comment.isPending && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                      Pending approval
                    </span>
                  )}
                </div>
              </div>
              <p className={comment.isPending ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {CLERK_ENABLED && isSignedIn ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="w-full px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : CLERK_ENABLED ? (
        <p className="text-gray-500 dark:text-gray-400">
          Sign in to leave a comment.
        </p>
      ) : null}
    </div>
  )
}
