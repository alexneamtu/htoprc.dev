import { GraphQLError } from 'graphql'
import { validateRequiredId, validateReason } from '../../utils/validation'
import { isUserAdmin } from '../../utils/auth'
import { type GraphQLContext, CONFIG_STATUS } from '../types'
import { requireAuthUser } from '../helpers'
import * as configService from '../../services/config.service'
import * as commentService from '../../services/comment.service'
import * as reportService from '../../services/report.service'

export const adminQueries = {
  isAdmin: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    requireAuthUser(ctx, userId)
    return isUserAdmin(ctx.db, userId)
  },

  adminStats: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const admin = await isUserAdmin(ctx.db, authedUserId)
    if (!admin) {
      return null
    }

    const stats = await ctx.db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM configs) as total_configs,
          (SELECT COUNT(*) FROM configs WHERE status = 'published') as published_configs,
          (SELECT COUNT(*) FROM configs WHERE status = 'pending') as pending_configs,
          (SELECT COUNT(*) FROM comments) as total_comments,
          (SELECT COUNT(*) FROM comments WHERE status = 'pending') as pending_comments,
          (SELECT COUNT(*) FROM likes) as total_likes,
          (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports
      `)
      .first<{
        total_configs: number
        published_configs: number
        pending_configs: number
        total_comments: number
        pending_comments: number
        total_likes: number
        pending_reports: number
      }>()

    return {
      totalConfigs: stats?.total_configs ?? 0,
      publishedConfigs: stats?.published_configs ?? 0,
      pendingConfigs: stats?.pending_configs ?? 0,
      totalComments: stats?.total_comments ?? 0,
      pendingComments: stats?.pending_comments ?? 0,
      totalLikes: stats?.total_likes ?? 0,
      pendingReports: stats?.pending_reports ?? 0,
    }
  },

  pendingConfigs: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const admin = await isUserAdmin(ctx.db, authedUserId)
    if (!admin) {
      return []
    }

    const result = await ctx.db
      .prepare('SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC')
      .bind(CONFIG_STATUS.PENDING)
      .all<configService.ConfigRow>()

    return (result.results ?? []).map(configService.mapConfigRow)
  },

  pendingComments: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const admin = await isUserAdmin(ctx.db, authedUserId)
    if (!admin) {
      return []
    }

    return commentService.getAllPendingComments(ctx.db)
  },

  pendingReports: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const admin = await isUserAdmin(ctx.db, authedUserId)
    if (!admin) {
      return []
    }

    return reportService.getPendingReports(ctx.db)
  },
}

export const adminMutations = {
  approveConfig: async (
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

    return configService.updateConfigStatus(ctx.db, validatedId, CONFIG_STATUS.PUBLISHED)
  },

  rejectConfig: async (
    _: unknown,
    { id, reason, userId }: { id: string; reason: string; userId: string },
    ctx: GraphQLContext
  ) => {
    const validatedId = validateRequiredId(id, 'id')
    const validatedReason = validateReason(reason)
    const authedUserId = requireAuthUser(ctx, userId)
    const isAdmin = await isUserAdmin(ctx.db, authedUserId)
    if (!isAdmin) {
      throw new GraphQLError('Not authorized: admin access required', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    return configService.updateConfigStatus(ctx.db, validatedId, CONFIG_STATUS.REJECTED, validatedReason)
  },

  approveComment: async (
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

    return commentService.approveComment(ctx.db, validatedId)
  },

  rejectComment: async (
    _: unknown,
    { id, reason, userId }: { id: string; reason: string; userId: string },
    ctx: GraphQLContext
  ) => {
    const validatedId = validateRequiredId(id, 'id')
    const validatedReason = validateReason(reason)
    const authedUserId = requireAuthUser(ctx, userId)
    const isAdmin = await isUserAdmin(ctx.db, authedUserId)
    if (!isAdmin) {
      throw new GraphQLError('Not authorized: admin access required', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    await commentService.rejectComment(ctx.db, validatedId, validatedReason)
    return true
  },
}
