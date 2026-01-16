import { GraphQLError } from 'graphql'
import { validateTitle, validateContent, validateSearch, validateRequiredId } from '../../utils/validation'
import { isUserAdmin } from '../../utils/auth'
import { submitConfigToIndexNow } from '../../utils/indexnow'
import { type GraphQLContext, CONFIG_STATUS, RATE_LIMITS, RateLimitError } from '../types'
import { requireAuthUser, checkRateLimit, checkAnonRateLimit } from '../helpers'
import * as configService from '../../services/config.service'
import * as userService from '../../services/user.service'
import * as commentService from '../../services/comment.service'

export const configQueries = {
  configs: async (
    _: unknown,
    {
      page = 1,
      limit = 20,
      sort = 'SCORE_DESC',
      minScore = 0,
      search,
      level = 'ALL',
    }: { page?: number; limit?: number; sort?: string; minScore?: number; search?: string; level?: string },
    ctx: GraphQLContext
  ) => {
    const MAX_LIMIT = 100
    const validatedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT)
    const validatedPage = Math.max(page, 1)
    const offset = (validatedPage - 1) * validatedLimit

    const sortMap: Record<string, string> = {
      SCORE_DESC: 'score DESC',
      LIKES_DESC: 'likes_count DESC',
      CREATED_DESC: 'created_at DESC',
      CREATED_ASC: 'created_at ASC',
    }
    const orderBy = sortMap[sort] || 'score DESC'

    const conditions = ['status = ?', 'score >= ?']
    const params: (string | number)[] = [CONFIG_STATUS.PUBLISHED, minScore]

    const validatedSearch = validateSearch(search)
    if (validatedSearch) {
      conditions.push("title LIKE ? ESCAPE '\\'")
      params.push(`%${validatedSearch}%`)
    }

    if (level === 'MINIMAL') {
      conditions.push('score < ?')
      params.push(10)
    } else if (level === 'MODERATE') {
      conditions.push('score >= ? AND score <= ?')
      params.push(10, 25)
    } else if (level === 'HEAVY') {
      conditions.push('score > ?')
      params.push(25)
    }

    const whereClause = conditions.join(' AND ')

    const countResult = await ctx.db
      .prepare(`SELECT COUNT(*) as count FROM configs WHERE ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>()
    const totalCount = countResult?.count ?? 0

    const result = await ctx.db
      .prepare(`SELECT * FROM configs WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...params, validatedLimit, offset)
      .all<configService.ConfigRow>()

    const nodes = (result.results ?? []).map(configService.mapConfigRow)
    const totalPages = Math.ceil(totalCount / validatedLimit)

    return {
      nodes,
      pageInfo: {
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1,
        page: validatedPage,
        totalPages,
      },
      totalCount,
    }
  },

  config: async (
    _: unknown,
    { id, slug }: { id?: string; slug?: string },
    ctx: GraphQLContext
  ) => {
    if (!id && !slug) return null

    return id
      ? configService.getPublishedConfig(ctx.db, id, false)
      : configService.getPublishedConfig(ctx.db, slug!, true)
  },

  recentConfigs: async (
    _: unknown,
    { limit = 6 }: { limit?: number },
    ctx: GraphQLContext
  ) => {
    const MAX_LIMIT = 50
    const validatedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT)

    const result = await ctx.db
      .prepare('SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC LIMIT ?')
      .bind(CONFIG_STATUS.PUBLISHED, validatedLimit)
      .all<configService.ConfigRow>()

    return (result.results ?? []).map(configService.mapConfigRow)
  },

  myConfigs: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    requireAuthUser(ctx, userId)
    const result = await ctx.db
      .prepare('SELECT * FROM configs WHERE author_id = ? AND status != ? ORDER BY created_at DESC')
      .bind(userId, CONFIG_STATUS.DELETED)
      .all<configService.ConfigRow>()

    return (result.results ?? []).map(configService.mapConfigRow)
  },

  likedConfigs: async (
    _: unknown,
    { userId }: { userId: string },
    ctx: GraphQLContext
  ) => {
    requireAuthUser(ctx, userId)
    const result = await ctx.db
      .prepare(`
        SELECT c.* FROM configs c
        INNER JOIN likes l ON c.id = l.config_id
        WHERE l.user_id = ? AND c.status = ?
        ORDER BY l.created_at DESC
      `)
      .bind(userId, CONFIG_STATUS.PUBLISHED)
      .all<configService.ConfigRow>()

    return (result.results ?? []).map(configService.mapConfigRow)
  },
}

export const configMutations = {
  uploadConfig: async (
    _: unknown,
    { input }: { input: { title: string; content: string; userId?: string; forkedFromId?: string } },
    ctx: GraphQLContext
  ) => {
    const validatedTitle = validateTitle(input.title)
    const validatedContent = validateContent(input.content)
    const validatedForkedFromId = input.forkedFromId
      ? validateRequiredId(input.forkedFromId, 'forkedFromId')
      : undefined
    const authedUserId = input.userId ? requireAuthUser(ctx, input.userId) : null

    let autoPublish = false
    if (authedUserId) {
      const user = await userService.ensureUser(ctx.db, authedUserId)
      autoPublish = user.isTrusted || user.isAdmin

      if (!autoPublish) {
        const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'upload')
        if (!rateLimit.allowed) {
          throw new RateLimitError('upload', RATE_LIMITS.upload.max)
        }
      }
    } else {
      const rateLimit = await checkAnonRateLimit(ctx.db, ctx.anonKey, 'upload')
      if (!rateLimit.allowed) {
        throw new RateLimitError('upload', RATE_LIMITS.upload.max)
      }
    }

    const config = await configService.createConfig(ctx.db, {
      title: validatedTitle,
      content: validatedContent,
      authorId: authedUserId,
      forkedFromId: validatedForkedFromId,
      autoPublish,
    })

    // Submit to IndexNow for instant indexing (non-blocking, production only)
    if (autoPublish) {
      submitConfigToIndexNow(config.slug).catch(() => {})
    }

    return config
  },

  updateConfig: async (
    _: unknown,
    { id, title, content, userId }: { id: string; title?: string; content: string; userId: string },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const validatedId = validateRequiredId(id, 'id')
    const validatedContent = validateContent(content)
    const validatedTitle = title ? validateTitle(title) : undefined

    const existing = await configService.getConfigRowById(ctx.db, validatedId)
    if (!existing) {
      throw new GraphQLError('Config not found', {
        extensions: { code: 'NOT_FOUND' }
      })
    }

    if (existing.source_type !== 'uploaded') {
      throw new GraphQLError('Only uploaded configs can be edited', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    if (existing.author_id && existing.author_id !== authedUserId) {
      throw new GraphQLError('You can only edit your own configs', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    return configService.updateConfig(ctx.db, validatedId, {
      title: validatedTitle,
      content: validatedContent,
    })
  },

  forkConfig: async (
    _: unknown,
    { id, title, userId }: { id: string; title: string; userId: string },
    ctx: GraphQLContext
  ) => {
    const authedUserId = requireAuthUser(ctx, userId)
    const validatedId = validateRequiredId(id, 'id')
    const validatedTitle = validateTitle(title)

    const user = await userService.ensureUser(ctx.db, authedUserId)
    const autoPublish = user.isTrusted || user.isAdmin

    if (!autoPublish) {
      const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'upload')
      if (!rateLimit.allowed) {
        throw new RateLimitError('fork', RATE_LIMITS.upload.max)
      }
    }

    const original = await configService.getConfigRowById(ctx.db, validatedId)
    if (!original) {
      throw new GraphQLError('Config not found', {
        extensions: { code: 'NOT_FOUND' }
      })
    }

    if (original.status !== CONFIG_STATUS.PUBLISHED) {
      throw new GraphQLError('Cannot fork a config that is not published', {
        extensions: { code: 'FORBIDDEN' },
      })
    }

    const config = await configService.createConfig(ctx.db, {
      title: validatedTitle,
      content: original.content,
      authorId: authedUserId,
      forkedFromId: validatedId,
      autoPublish,
    })

    // Submit to IndexNow for instant indexing (non-blocking, production only)
    if (autoPublish) {
      submitConfigToIndexNow(config.slug).catch(() => {})
    }

    return config
  },

  deleteConfig: async (
    _: unknown,
    { id, userId }: { id: string; userId: string },
    ctx: GraphQLContext
  ) => {
    const validatedId = validateRequiredId(id, 'id')
    const authedUserId = requireAuthUser(ctx, userId)

    const config = await configService.getConfigById(ctx.db, validatedId)
    if (!config) {
      throw new GraphQLError('Config not found', {
        extensions: { code: 'NOT_FOUND' }
      })
    }

    const isOwner = config.authorId === authedUserId
    const isAdmin = await isUserAdmin(ctx.db, authedUserId)

    if (!isOwner && !isAdmin) {
      throw new GraphQLError('Not authorized to delete this config', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    await configService.softDeleteConfig(ctx.db, validatedId)
    return true
  },
}

export const configFieldResolvers = {
  comments: async (parent: { id: string }, _args: unknown, ctx: GraphQLContext) => {
    return commentService.getCommentsForConfig(ctx.db, parent.id)
  },

  forkedFrom: async (parent: { forked_from_id: string | null }, _args: unknown, ctx: GraphQLContext) => {
    if (!parent.forked_from_id) return null
    return configService.getForkedFromConfig(ctx.db, parent.forked_from_id)
  },
}
