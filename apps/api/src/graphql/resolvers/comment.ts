import { validateComment, validateRequiredId } from '../../utils/validation'
import { isUserAdmin } from '../../utils/auth'
import { type GraphQLContext, RATE_LIMITS, RateLimitError } from '../types'
import { requireAuthUser, checkRateLimit } from '../helpers'
import * as commentService from '../../services/comment.service'
import * as userService from '../../services/user.service'

export const commentQueries = {
  myPendingComments: async (
    _: unknown,
    { configId, userId }: { configId: string; userId: string },
    ctx: GraphQLContext
  ) => {
    requireAuthUser(ctx, userId)
    return commentService.getPendingCommentsByUser(ctx.db, configId, userId)
  },
}

export const commentMutations = {
  addComment: async (
    _: unknown,
    { configId, userId, content, username, avatarUrl }: {
      configId: string
      userId: string
      content: string
      username?: string
      avatarUrl?: string
    },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const validatedConfigId = validateRequiredId(configId, 'configId')
    const validatedContent = validateComment(content)

    const user = await userService.ensureUser(ctx.db, authedUserId, { username, avatarUrl })

    const userIsAdmin = await isUserAdmin(ctx.db, authedUserId)
    if (!userIsAdmin) {
      const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'comment')
      if (!rateLimit.allowed) {
        throw new RateLimitError('comment', RATE_LIMITS.comment.max)
      }
    }

    return commentService.addComment(ctx.db, {
      configId: validatedConfigId,
      authorId: authedUserId,
      authorUsername: user.username,
      authorAvatarUrl: user.avatarUrl,
      content: validatedContent,
      autoPublish: user.isTrusted,
    })
  },
}
