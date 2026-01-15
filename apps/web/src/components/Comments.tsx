import { useState, useCallback } from 'react'
import { useMutation } from 'urql'
import { useAuth } from '../services/auth'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const ADD_COMMENT_MUTATION = /* GraphQL */ `
  mutation AddComment($configId: ID!, $userId: ID!, $content: String!, $username: String, $avatarUrl: String) {
    addComment(configId: $configId, userId: $userId, content: $content, username: $username, avatarUrl: $avatarUrl) {
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

interface Comment {
  id: string
  content: string
  author: {
    id: string
    username: string
    avatarUrl: string | null
  }
  createdAt: string
}

interface CommentsProps {
  configId: string
  comments: Comment[]
}

export function Comments({ configId, comments: initialComments }: CommentsProps) {
  const { user, isSignedIn } = CLERK_ENABLED
    ? useAuth()
    : { user: null, isSignedIn: false }

  const [comments, setComments] = useState(initialComments)
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
      setComments([...comments, result.data.addComment])
      setNewComment('')
    }
  }, [isSignedIn, user, newComment, configId, addComment, comments])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>

      {comments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
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
                <div>
                  <span className="font-medium">{comment.author.username}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
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
