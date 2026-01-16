import { GraphQLError } from 'graphql'
import { validateRequiredId, validateReason } from '../../utils/validation'
import { isUserAdmin } from '../../utils/auth'
import { type GraphQLContext, RATE_LIMITS, RateLimitError } from '../types'
import { requireAuthUser, checkRateLimit } from '../helpers'
import * as reportService from '../../services/report.service'
import * as userService from '../../services/user.service'

export const reportMutations = {
  reportContent: async (
    _: unknown,
    { contentType, contentId, reason, userId }: {
      contentType: string
      contentId: string
      reason: string
      userId: string
    },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const validatedContentId = validateRequiredId(contentId, 'contentId')

    const validContentTypes = ['config', 'comment'] as const
    if (!validContentTypes.includes(contentType as typeof validContentTypes[number])) {
      throw new GraphQLError('Invalid content type. Must be "config" or "comment"', {
        extensions: { code: 'VALIDATION_ERROR' }
      })
    }

    const validatedReason = validateReason(reason)

    // Check if user is the author of the content
    const isAuthor = await reportService.isContentAuthor(
      ctx.db,
      contentType as 'config' | 'comment',
      validatedContentId,
      authedUserId
    )
    if (isAuthor) {
      throw new GraphQLError('You cannot report your own content', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    // Ensure user exists
    await userService.ensureUser(ctx.db, authedUserId)

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'report')
    if (!rateLimit.allowed) {
      throw new RateLimitError('report', RATE_LIMITS.report.max)
    }

    await reportService.createReport(
      ctx.db,
      contentType as 'config' | 'comment',
      validatedContentId,
      authedUserId,
      validatedReason
    )

    return true
  },

  dismissReport: async (
    _: unknown,
    { id, userId }: { id: string; userId: string },
    ctx: GraphQLContext
  ) => {
    const validatedId = validateRequiredId(id, 'id')
    const authedUserId = requireAuthUser(ctx, userId)
    const isAdmin = await isUserAdmin(ctx.db, authedUserId)
    if (!isAdmin) {
      throw new GraphQLError('Not authorized: admin access required', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    return reportService.dismissReport(ctx.db, validatedId)
  },
}
