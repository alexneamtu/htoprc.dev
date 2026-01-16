import { validateRequiredId } from '../../utils/validation'
import { type GraphQLContext, RATE_LIMITS, RateLimitError } from '../types'
import { requireAuthUser, checkRateLimit } from '../helpers'
import * as likeService from '../../services/like.service'
import * as userService from '../../services/user.service'

export const likeQueries = {
  hasLiked: async (
    _: unknown,
    { configId, userId }: { configId: string; userId: string },
    ctx: GraphQLContext
  ) => {
    requireAuthUser(ctx, userId)
    return likeService.hasUserLiked(ctx.db, configId, userId)
  },
}

export const likeMutations = {
  toggleLike: async (
    _: unknown,
    { configId, userId, username, avatarUrl }: {
      configId: string
      userId: string
      username?: string
      avatarUrl?: string
    },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const validatedConfigId = validateRequiredId(configId, 'configId')

    await userService.ensureUser(ctx.db, authedUserId, { username, avatarUrl })

    const alreadyLiked = await likeService.hasUserLiked(ctx.db, validatedConfigId, authedUserId)

    if (alreadyLiked) {
      const likesCount = await likeService.removeLike(ctx.db, validatedConfigId, authedUserId)
      return { liked: false, likesCount }
    } else {
      // Check rate limit only when adding a like
      const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'like')
      if (!rateLimit.allowed) {
        throw new RateLimitError('like', RATE_LIMITS.like.max)
      }

      const likesCount = await likeService.addLike(ctx.db, validatedConfigId, authedUserId)
      return { liked: true, likesCount }
    }
  },
}
