import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQuery } from 'urql'
import { useAuth } from '../services/auth'

const TOGGLE_LIKE_MUTATION = /* GraphQL */ `
  mutation ToggleLike($configId: ID!, $userId: ID!, $username: String, $avatarUrl: String) {
    toggleLike(configId: $configId, userId: $userId, username: $username, avatarUrl: $avatarUrl) {
      liked
      likesCount
    }
  }
`

const CHECK_LIKE_QUERY = /* GraphQL */ `
  query CheckLike($configId: ID!, $userId: ID!) {
    hasLiked(configId: $configId, userId: $userId)
  }
`

interface LikeButtonProps {
  configId: string
  initialLikesCount: number
  size?: 'sm' | 'md'
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export function LikeButton({ configId, initialLikesCount, size = 'md' }: LikeButtonProps) {
  const { user, isSignedIn } = CLERK_ENABLED
    ? useAuth()
    : { user: null, isSignedIn: false }

  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [liked, setLiked] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [, toggleLike] = useMutation(TOGGLE_LIKE_MUTATION)

  // Check if user has already liked this config
  const [{ data: likeData }] = useQuery({
    query: CHECK_LIKE_QUERY,
    variables: { configId, userId: user?.id },
    pause: !isSignedIn || !user?.id,
  })

  // Update liked state when query returns
  useEffect(() => {
    if (likeData?.hasLiked !== undefined) {
      setLiked(likeData.hasLiked)
    }
  }, [likeData?.hasLiked])

  const handleClick = useCallback(async () => {
    if (!isSignedIn || !user || isPending) {
      return
    }

    setIsPending(true)

    // Optimistic update
    setLiked(!liked)
    setLikesCount(liked ? likesCount - 1 : likesCount + 1)

    const result = await toggleLike({
      configId,
      userId: user.id,
      username: user.username || user.email?.split('@')[0] || 'User',
      avatarUrl: user.avatarUrl,
    })

    if (result.error) {
      // Revert on error
      setLiked(liked)
      setLikesCount(likesCount)
    } else if (result.data?.toggleLike) {
      setLiked(result.data.toggleLike.liked)
      setLikesCount(result.data.toggleLike.likesCount)
    }

    setIsPending(false)
  }, [isSignedIn, user, liked, likesCount, configId, toggleLike, isPending])

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  if (!CLERK_ENABLED) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${sizeClasses} text-gray-500`}>
        <HeartIcon filled={false} className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
        <span>{likesCount}</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isSignedIn || isPending}
      className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-md transition-colors ${
        liked
          ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
          : 'text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${!isSignedIn || isPending ? 'cursor-default opacity-75' : ''}`}
      title={isSignedIn ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
    >
      <HeartIcon filled={liked} className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      <span>{likesCount}</span>
    </button>
  )
}

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  )
}
