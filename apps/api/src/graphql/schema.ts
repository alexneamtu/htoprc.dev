import { createSchema } from 'graphql-yoga'
import { GraphQLError } from 'graphql'
import { parseHtoprc } from '@htoprc/parser'
import { isUserAdmin } from '../utils/auth'
import {
  validateTitle,
  validateContent,
  validateComment,
  validateReason,
  validateSearch,
  validateRequiredId,
} from '../utils/validation'
import {
  type GraphQLContext,
  type ConfigRow,
  type CommentRow,
  RATE_LIMITS,
  RateLimitError,
  CONFIG_STATUS,
  COMMENT_STATUS,
  REPORT_STATUS,
} from './types'
import {
  sha256,
  generateUniqueSlug,
  requireAuthUser,
  mapConfigRow,
  checkRateLimit,
  checkAnonRateLimit,
} from './helpers'

// Simple initial schema - will be expanded with Pothos later
export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
    enum ConfigSort {
      SCORE_DESC
      LIKES_DESC
      CREATED_DESC
      CREATED_ASC
    }

    enum CustomizationLevel {
      ALL
      MINIMAL
      MODERATE
      HEAVY
    }

    type Query {
      health: Health!
      configs(page: Int = 1, limit: Int = 20, sort: ConfigSort = SCORE_DESC, minScore: Int = 0, search: String, level: CustomizationLevel = ALL): ConfigConnection!
      config(id: ID, slug: String): Config
      recentConfigs(limit: Int = 6): [Config!]!
      myConfigs(userId: ID!): [Config!]!
      likedConfigs(userId: ID!): [Config!]!
      adminStats(userId: ID!): AdminStats
      pendingConfigs(userId: ID!): [Config!]!
      pendingComments(userId: ID!): [PendingComment!]!
      pendingReports(userId: ID!): [Report!]!
      isAdmin(userId: ID!): Boolean!
      hasLiked(configId: ID!, userId: ID!): Boolean!
      myPendingComments(configId: ID!, userId: ID!): [Comment!]!
    }

    type Mutation {
      uploadConfig(input: UploadConfigInput!): Config!
      updateConfig(id: ID!, title: String, content: String!, userId: ID!): Config!
      forkConfig(id: ID!, title: String!, userId: ID!): Config!
      toggleLike(configId: ID!, userId: ID!, username: String, avatarUrl: String): LikeResult!
      addComment(configId: ID!, userId: ID!, content: String!, username: String, avatarUrl: String): Comment!
      approveConfig(id: ID!, userId: ID!): Config!
      rejectConfig(id: ID!, reason: String!, userId: ID!): Config!
      approveComment(id: ID!, userId: ID!): Comment!
      rejectComment(id: ID!, reason: String!, userId: ID!): Boolean!
      reportContent(contentType: String!, contentId: ID!, reason: String!, userId: ID!): Boolean!
      dismissReport(id: ID!, userId: ID!): Boolean!
      deleteConfig(id: ID!, userId: ID!): Boolean!
    }

    type AdminStats {
      totalConfigs: Int!
      publishedConfigs: Int!
      pendingConfigs: Int!
      totalComments: Int!
      pendingComments: Int!
      totalLikes: Int!
      pendingReports: Int!
    }

    type Report {
      id: ID!
      contentType: String!
      contentId: ID!
      contentSlug: String
      contentTitle: String
      reason: String!
      createdAt: String!
    }

    type PendingComment {
      id: ID!
      content: String!
      configId: ID!
      configSlug: String!
      configTitle: String!
      authorId: ID!
      authorUsername: String!
      createdAt: String!
    }

    type LikeResult {
      liked: Boolean!
      likesCount: Int!
    }

    type Health {
      status: String!
      timestamp: String!
    }

    type Config {
      id: ID!
      slug: String!
      title: String!
      content: String!
      sourceType: String!
      sourceUrl: String
      sourcePlatform: String
      authorId: ID
      forkedFromId: ID
      forkedFrom: ForkedFromConfig
      status: String!
      score: Int!
      likesCount: Int!
      createdAt: String!
      comments: [Comment!]!
    }

    type ForkedFromConfig {
      id: ID!
      slug: String!
      title: String!
    }

    type Comment {
      id: ID!
      content: String!
      author: CommentAuthor!
      createdAt: String!
    }

    type CommentAuthor {
      id: ID!
      username: String!
      avatarUrl: String
    }

    type ConfigConnection {
      nodes: [Config!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      page: Int!
      totalPages: Int!
    }

    input UploadConfigInput {
      title: String!
      content: String!
      userId: ID
      forkedFromId: ID
    }
  `,
  resolvers: {
    Query: {
      health: () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
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
        // Enforce pagination limits to prevent DoS
        const MAX_LIMIT = 100
        const validatedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT)
        const validatedPage = Math.max(page, 1)
        const offset = (validatedPage - 1) * validatedLimit

        // Map sort enum to SQL
        const sortMap: Record<string, string> = {
          SCORE_DESC: 'score DESC',
          LIKES_DESC: 'likes_count DESC',
          CREATED_DESC: 'created_at DESC',
          CREATED_ASC: 'created_at ASC',
        }
        const orderBy = sortMap[sort] || 'score DESC'

        // Build WHERE clause
        const conditions = ['status = ?', 'score >= ?']
        const params: (string | number)[] = [CONFIG_STATUS.PUBLISHED, minScore]

        // Validate and escape search input
        const validatedSearch = validateSearch(search)
        if (validatedSearch) {
          conditions.push("title LIKE ? ESCAPE '\\'")
          params.push(`%${validatedSearch}%`)
        }

        // Customization level filter (Minimal: 0-9, Moderate: 10-25, Heavy: 26+)
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

        // Get total count
        const countResult = await ctx.db
          .prepare(`SELECT COUNT(*) as count FROM configs WHERE ${whereClause}`)
          .bind(...params)
          .first<{ count: number }>()
        const totalCount = countResult?.count ?? 0

        // Get configs
        const result = await ctx.db
          .prepare(
            `SELECT * FROM configs WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
          )
          .bind(...params, validatedLimit, offset)
          .all<ConfigRow>()

        const nodes = (result.results ?? []).map(mapConfigRow)

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

        const query = id
          ? 'SELECT * FROM configs WHERE id = ? AND status = ?'
          : 'SELECT * FROM configs WHERE slug = ? AND status = ?'
        const param = id ?? slug

        const row = await ctx.db.prepare(query).bind(param, CONFIG_STATUS.PUBLISHED).first<ConfigRow>()

        if (!row) return null

        return mapConfigRow(row)
      },
      recentConfigs: async (
        _: unknown,
        { limit = 6 }: { limit?: number },
        ctx: GraphQLContext
      ) => {
        // Enforce pagination limit to prevent DoS
        const MAX_LIMIT = 50
        const validatedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT)

        const result = await ctx.db
          .prepare('SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC LIMIT ?')
          .bind(CONFIG_STATUS.PUBLISHED, validatedLimit)
          .all<ConfigRow>()

        return (result.results ?? []).map(mapConfigRow)
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
          .all<ConfigRow>()

        return (result.results ?? []).map(mapConfigRow)
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
          .all<ConfigRow>()

        return (result.results ?? []).map(mapConfigRow)
      },
      isAdmin: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        requireAuthUser(ctx, userId)
        return isUserAdmin(ctx.db, userId)
      },
      hasLiked: async (
        _: unknown,
        { configId, userId }: { configId: string; userId: string },
        ctx: GraphQLContext
      ) => {
        requireAuthUser(ctx, userId)
        const like = await ctx.db
          .prepare('SELECT 1 FROM likes WHERE config_id = ? AND user_id = ?')
          .bind(configId, userId)
          .first()
        return !!like
      },
      myPendingComments: async (
        _: unknown,
        { configId, userId }: { configId: string; userId: string },
        ctx: GraphQLContext
      ) => {
        requireAuthUser(ctx, userId)
        const result = await ctx.db
          .prepare(`
            SELECT c.id, c.content, c.created_at, c.author_id,
                   u.username as author_username, u.avatar_url as author_avatar_url
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.config_id = ? AND c.author_id = ? AND c.status = ?
            ORDER BY c.created_at ASC
          `)
          .bind(configId, userId, CONFIG_STATUS.PENDING)
          .all<CommentRow>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          content: row.content,
          author: {
            id: row.author_id,
            username: row.author_username ?? 'Anonymous',
            avatarUrl: row.author_avatar_url,
          },
          createdAt: row.created_at,
        }))
      },
      adminStats: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        // Only admins can see full stats
        const authedUserId = requireAuthUser(ctx, userId)
        const admin = await isUserAdmin(ctx.db, authedUserId)
        if (!admin) {
          return null
        }

        // Single query to get all admin stats (more efficient than 7 separate queries)
        const stats = await ctx.db
          .prepare(`
            SELECT
              (SELECT COUNT(*) FROM configs) as total_configs,
              (SELECT COUNT(*) FROM configs WHERE status = CONFIG_STATUS.PUBLISHED) as published_configs,
              (SELECT COUNT(*) FROM configs WHERE status = CONFIG_STATUS.PENDING) as pending_configs,
              (SELECT COUNT(*) FROM comments) as total_comments,
              (SELECT COUNT(*) FROM comments WHERE status = CONFIG_STATUS.PENDING) as pending_comments,
              (SELECT COUNT(*) FROM likes) as total_likes,
              (SELECT COUNT(*) FROM reports WHERE status = CONFIG_STATUS.PENDING) as pending_reports
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
        // Only admins can see all pending configs
        const authedUserId = requireAuthUser(ctx, userId)
        const admin = await isUserAdmin(ctx.db, authedUserId)
        if (!admin) {
          return []
        }

        const result = await ctx.db
          .prepare('SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC')
          .bind(CONFIG_STATUS.PENDING)
          .all<ConfigRow>()

        return (result.results ?? []).map(mapConfigRow)
      },
      pendingComments: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        // Only admins can see pending comments
        const authedUserId = requireAuthUser(ctx, userId)
        const admin = await isUserAdmin(ctx.db, authedUserId)
        if (!admin) {
          return []
        }

        const result = await ctx.db
          .prepare(`
            SELECT c.id, c.content, c.config_id, c.author_id, c.created_at,
                   cfg.slug as config_slug,
                   cfg.title as config_title,
                   u.username as author_username
            FROM comments c
            LEFT JOIN configs cfg ON c.config_id = cfg.id
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.status = ?
            ORDER BY c.created_at DESC
          `)
          .bind(CONFIG_STATUS.PENDING)
          .all<{
            id: string
            content: string
            config_id: string
            config_slug: string
            config_title: string
            author_id: string
            author_username: string
            created_at: string
          }>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          content: row.content,
          configId: row.config_id,
          configSlug: row.config_slug ?? '',
          configTitle: row.config_title ?? 'Unknown',
          authorId: row.author_id,
          authorUsername: row.author_username ?? 'Anonymous',
          createdAt: row.created_at,
        }))
      },
      pendingReports: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        // Only admins can see reports
        const authedUserId = requireAuthUser(ctx, userId)
        const admin = await isUserAdmin(ctx.db, authedUserId)
        if (!admin) {
          return []
        }

        const result = await ctx.db
          .prepare(`
            SELECT r.id, r.content_type, r.content_id, r.reason, r.created_at,
                   CASE
                     WHEN r.content_type = 'config' THEN cfg.slug
                     WHEN r.content_type = 'comment' THEN cfg2.slug
                   END as content_slug,
                   CASE
                     WHEN r.content_type = 'config' THEN cfg.title
                     WHEN r.content_type = 'comment' THEN cfg2.title
                   END as content_title
            FROM reports r
            LEFT JOIN configs cfg ON r.content_type = 'config' AND r.content_id = cfg.id
            LEFT JOIN comments cmt ON r.content_type = 'comment' AND r.content_id = cmt.id
            LEFT JOIN configs cfg2 ON cmt.config_id = cfg2.id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
          `)
          .bind(CONFIG_STATUS.PENDING)
          .all<{
            id: string
            content_type: string
            content_id: string
            content_slug: string | null
            content_title: string | null
            reason: string
            created_at: string
          }>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          contentType: row.content_type,
          contentId: row.content_id,
          contentSlug: row.content_slug,
          contentTitle: row.content_title,
          reason: row.reason,
          createdAt: row.created_at,
        }))
      },
    },
    Mutation: {
      uploadConfig: async (
        _: unknown,
        { input }: { input: { title: string; content: string; userId?: string; forkedFromId?: string } },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedTitle = validateTitle(input.title)
        const validatedContent = validateContent(input.content)

        const authedUserId = input.userId ? requireAuthUser(ctx, input.userId) : null

        // Ensure user exists before rate limiting (rate_limits has FK to users)
        let isTrustedOrAdmin = false
        if (authedUserId) {
          const user = await ctx.db
            .prepare('SELECT is_trusted, is_admin FROM users WHERE id = ?')
            .bind(authedUserId)
            .first<{ is_trusted: number; is_admin: number }>()

          if (!user) {
            await ctx.db
              .prepare('INSERT INTO users (id, username, is_trusted, is_admin) VALUES (?, ?, 0, 0)')
              .bind(authedUserId, 'User')
              .run()
            isTrustedOrAdmin = false
          } else {
            isTrustedOrAdmin = user.is_trusted === 1 || user.is_admin === 1
          }

          // Check rate limit (skip for admins)
          if (!isTrustedOrAdmin) {
            const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'upload')
            if (!rateLimit.allowed) {
              throw new RateLimitError('upload', RATE_LIMITS.upload.max)
            }
          }
        }

        if (!authedUserId) {
          const rateLimit = await checkAnonRateLimit(ctx.db, ctx.anonKey, 'upload')
          if (!rateLimit.allowed) {
            throw new RateLimitError('upload', RATE_LIMITS.upload.max)
          }
        }

        // Validate forkedFromId if provided
        let validatedForkedFromId: string | null = null
        if (input.forkedFromId) {
          validatedForkedFromId = validateRequiredId(input.forkedFromId, 'forkedFromId')
          const forkedFrom = await ctx.db
            .prepare('SELECT id, status FROM configs WHERE id = ?')
            .bind(validatedForkedFromId)
            .first<{ id: string; status: string }>()
          if (!forkedFrom) {
            throw new GraphQLError('The config you are trying to fork does not exist', {
              extensions: { code: 'NOT_FOUND' },
            })
          }
          if (forkedFrom.status !== CONFIG_STATUS.PUBLISHED) {
            throw new GraphQLError('Cannot fork a config that is not published', {
              extensions: { code: 'FORBIDDEN' },
            })
          }
        }

        // Parse the config to calculate score and detect version
        const parsed = parseHtoprc(validatedContent)

        const id = crypto.randomUUID()
        const slug = await generateUniqueSlug(ctx.db, validatedTitle)
        const contentHash = await sha256(validatedContent)
        const createdAt = new Date().toISOString()
        const status = isTrustedOrAdmin ? CONFIG_STATUS.PUBLISHED : CONFIG_STATUS.PENDING

        await ctx.db
          .prepare(
            `INSERT INTO configs (id, slug, title, content, content_hash, source_type, author_id, forked_from_id, score, htop_version, status, likes_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            slug,
            validatedTitle,
            validatedContent,
            contentHash,
            'uploaded',
            authedUserId,
            validatedForkedFromId,
            parsed.score,
            parsed.config.htopVersion ?? null,
            status,
            0,
            createdAt
          )
          .run()

        return {
          id,
          slug,
          title: validatedTitle,
          content: validatedContent,
          sourceType: 'uploaded',
          sourceUrl: null,
          sourcePlatform: null,
          authorId: authedUserId,
          forkedFromId: validatedForkedFromId,
          status,
          score: parsed.score,
          likesCount: 0,
          createdAt,
        }
      },
      updateConfig: async (
        _: unknown,
        { id, title, content, userId }: { id: string; title?: string; content: string; userId: string },
        ctx: GraphQLContext
      ) => {
        const authedUserId = requireAuthUser(ctx, userId)
        // Validate input
        const validatedId = validateRequiredId(id, 'id')
        const validatedContent = validateContent(content)
        const validatedTitle = title ? validateTitle(title) : undefined

        // Get the existing config
        const existing = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(validatedId)
          .first<ConfigRow>()

        if (!existing) {
          throw new GraphQLError('Config not found', {
            extensions: { code: 'NOT_FOUND' }
          })
        }

        // Check if user is the author (only uploaded configs can be edited by their author)
        if (existing.source_type !== 'uploaded') {
          throw new GraphQLError('Only uploaded configs can be edited', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        // For uploaded configs, check author_id or allow if it's null (legacy)
        if (existing.author_id && existing.author_id !== authedUserId) {
          throw new GraphQLError('You can only edit your own configs', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        // Parse the new content to calculate score
        const parsed = parseHtoprc(validatedContent)
        const contentHash = await sha256(validatedContent)
        const newTitle = validatedTitle || existing.title

        await ctx.db
          .prepare(
            `UPDATE configs SET title = ?, content = ?, content_hash = ?, score = ?, htop_version = ? WHERE id = ?`
          )
          .bind(
            newTitle,
            validatedContent,
            contentHash,
            parsed.score,
            parsed.config.htopVersion ?? null,
            id
          )
          .run()

        return {
          id: existing.id,
          slug: existing.slug,
          title: newTitle,
          content: validatedContent,
          sourceType: existing.source_type,
          sourceUrl: existing.source_url,
          sourcePlatform: existing.source_platform,
          authorId: existing.author_id,
          forkedFromId: existing.forked_from_id,
          status: existing.status,
          score: parsed.score,
          likesCount: existing.likes_count,
          createdAt: existing.created_at,
        }
      },
      forkConfig: async (
        _: unknown,
        { id, title, userId }: { id: string; title: string; userId: string },
        ctx: GraphQLContext
      ) => {
        const authedUserId = requireAuthUser(ctx, userId)
        // Validate input
        const validatedId = validateRequiredId(id, 'id')
        const validatedTitle = validateTitle(title)

        // Check if user is trusted/admin for auto-publish
        let isTrustedOrAdmin = false
        const user = await ctx.db
          .prepare('SELECT is_trusted, is_admin FROM users WHERE id = ?')
          .bind(authedUserId)
          .first<{ is_trusted: number; is_admin: number }>()

        if (!user) {
          // Create user if not exists
          await ctx.db
            .prepare('INSERT INTO users (id, username, is_trusted, is_admin) VALUES (?, ?, 0, 0)')
            .bind(authedUserId, 'User')
            .run()
          isTrustedOrAdmin = false
        } else {
          isTrustedOrAdmin = user.is_trusted === 1 || user.is_admin === 1
        }

        // Check rate limit (skip for trusted/admin)
        if (!isTrustedOrAdmin) {
          const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'upload')
          if (!rateLimit.allowed) {
            throw new RateLimitError('fork', RATE_LIMITS.upload.max)
          }
        }

        // Get the original config
        const original = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(validatedId)
          .first<ConfigRow>()

        if (!original) {
          throw new GraphQLError('Config not found', {
            extensions: { code: 'NOT_FOUND' }
          })
        }

        // Only allow forking published configs
        if (original.status !== CONFIG_STATUS.PUBLISHED) {
          throw new GraphQLError('Cannot fork a config that is not published', {
            extensions: { code: 'FORBIDDEN' },
          })
        }

        // Parse the config to calculate score
        const parsed = parseHtoprc(original.content)

        const newId = crypto.randomUUID()
        const slug = await generateUniqueSlug(ctx.db, validatedTitle)
        const contentHash = await sha256(original.content)
        const createdAt = new Date().toISOString()
        const status = isTrustedOrAdmin ? CONFIG_STATUS.PUBLISHED : CONFIG_STATUS.PENDING

        await ctx.db
          .prepare(
            `INSERT INTO configs (id, slug, title, content, content_hash, source_type, author_id, forked_from_id, score, htop_version, status, likes_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newId,
            slug,
            validatedTitle,
            original.content,
            contentHash,
            'uploaded',
            authedUserId,
            validatedId,
            parsed.score,
            parsed.config.htopVersion ?? null,
            status,
            0,
            createdAt
          )
          .run()

        return {
          id: newId,
          slug,
          title: validatedTitle,
          content: original.content,
          sourceType: 'uploaded',
          sourceUrl: null,
          sourcePlatform: null,
          authorId: authedUserId,
          forkedFromId: validatedId,
          status,
          score: parsed.score,
          likesCount: 0,
          createdAt,
        }
      },
      toggleLike: async (
        _: unknown,
        { configId, userId, username, avatarUrl }: { configId: string; userId: string; username?: string; avatarUrl?: string },
        ctx: GraphQLContext
      ) => {
        const authedUserId = requireAuthUser(ctx, userId)
        const validatedConfigId = validateRequiredId(configId, 'configId')
        // Ensure user exists with proper info
        const userExists = await ctx.db
          .prepare('SELECT 1 FROM users WHERE id = ?')
          .bind(authedUserId)
          .first()

        const finalUsername = username || 'User'

        if (!userExists) {
          await ctx.db
            .prepare('INSERT INTO users (id, username, avatar_url, is_trusted, is_admin) VALUES (?, ?, ?, 0, 0)')
            .bind(authedUserId, finalUsername, avatarUrl || null)
            .run()
        } else if (username || avatarUrl) {
          // Update user info if provided
          await ctx.db
            .prepare('UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
            .bind(username || null, avatarUrl || null, authedUserId)
            .run()
        }

        // Check if already liked
        const existing = await ctx.db
          .prepare('SELECT 1 FROM likes WHERE user_id = ? AND config_id = ?')
          .bind(authedUserId, validatedConfigId)
          .first()

        if (existing) {
          // Unlike: remove the like
          await ctx.db
            .prepare('DELETE FROM likes WHERE user_id = ? AND config_id = ?')
            .bind(authedUserId, validatedConfigId)
            .run()

          // Decrement likes count (prevent negative values)
          await ctx.db
            .prepare('UPDATE configs SET likes_count = MAX(likes_count - 1, 0) WHERE id = ?')
            .bind(validatedConfigId)
            .run()

          const config = await ctx.db
            .prepare('SELECT likes_count FROM configs WHERE id = ?')
            .bind(validatedConfigId)
            .first<{ likes_count: number }>()

          return {
            liked: false,
            likesCount: config?.likes_count ?? 0,
          }
        } else {
          // Check rate limit for likes (only when adding, not removing)
          const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'like')
          if (!rateLimit.allowed) {
            throw new RateLimitError('like', RATE_LIMITS.like.max)
          }

          // Like: add the like
          await ctx.db
            .prepare('INSERT INTO likes (user_id, config_id) VALUES (?, ?)')
            .bind(authedUserId, validatedConfigId)
            .run()

          // Increment likes count
          await ctx.db
            .prepare('UPDATE configs SET likes_count = likes_count + 1 WHERE id = ?')
            .bind(validatedConfigId)
            .run()

          const config = await ctx.db
            .prepare('SELECT likes_count FROM configs WHERE id = ?')
            .bind(validatedConfigId)
            .first<{ likes_count: number }>()

          return {
            liked: true,
            likesCount: config?.likes_count ?? 0,
          }
        }
      },
      addComment: async (
        _: unknown,
        { configId, userId, content, username: inputUsername, avatarUrl: inputAvatarUrl }: { configId: string; userId: string; content: string; username?: string; avatarUrl?: string },
        ctx: GraphQLContext
      ) => {
        const authedUserId = requireAuthUser(ctx, userId)
        const validatedConfigId = validateRequiredId(configId, 'configId')
        // Validate input
        const validatedContent = validateComment(content)

        // Check if user exists, create or update with provided info
        let user = await ctx.db
          .prepare('SELECT is_trusted, username, avatar_url FROM users WHERE id = ?')
          .bind(authedUserId)
          .first<{ is_trusted: number; username: string; avatar_url: string | null }>()

        const finalUsername = inputUsername || user?.username || 'User'
        const finalAvatarUrl = inputAvatarUrl || user?.avatar_url || null

        if (!user) {
          // Create user with info from Clerk
          await ctx.db
            .prepare('INSERT INTO users (id, username, avatar_url, is_trusted, is_admin) VALUES (?, ?, ?, 0, 0)')
            .bind(authedUserId, finalUsername, finalAvatarUrl)
            .run()
          user = { is_trusted: 0, username: finalUsername, avatar_url: finalAvatarUrl }
        } else if (inputUsername || inputAvatarUrl) {
          // Update user info if provided
          await ctx.db
            .prepare('UPDATE users SET username = ?, avatar_url = ? WHERE id = ?')
            .bind(finalUsername, finalAvatarUrl, authedUserId)
            .run()
        }

        // Check rate limit (skip for admins)
        const userIsAdmin = await isUserAdmin(ctx.db, authedUserId)
        if (!userIsAdmin) {
          const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'comment')
          if (!rateLimit.allowed) {
            throw new RateLimitError('comment', RATE_LIMITS.comment.max)
          }
        }

        const id = crypto.randomUUID()
        const createdAt = new Date().toISOString()

        const status = user.is_trusted ? CONFIG_STATUS.PUBLISHED : CONFIG_STATUS.PENDING

        await ctx.db
          .prepare(
            'INSERT INTO comments (id, config_id, author_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(id, validatedConfigId, authedUserId, validatedContent, status, createdAt)
          .run()

        return {
          id,
          content: validatedContent,
          author: {
            id: authedUserId,
            username: finalUsername,
            avatarUrl: finalAvatarUrl,
          },
          createdAt,
        }
      },
      approveConfig: async (
        _: unknown,
        { id, userId }: { id: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedId = validateRequiredId(id, 'id')

        // Authorization check
        const authedUserId = requireAuthUser(ctx, userId)
        const isAdmin = await isUserAdmin(ctx.db, authedUserId)
        if (!isAdmin) {
          throw new GraphQLError('Not authorized: admin access required', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        await ctx.db
          .prepare('UPDATE configs SET status = ? WHERE id = ?')
          .bind(CONFIG_STATUS.PUBLISHED, validatedId)
          .run()

        const row = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(validatedId)
          .first<ConfigRow>()

        if (!row) {
          throw new GraphQLError('Config not found', {
            extensions: { code: 'NOT_FOUND' }
          })
        }

        return mapConfigRow(row)
      },
      rejectConfig: async (
        _: unknown,
        { id, reason, userId }: { id: string; reason: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedId = validateRequiredId(id, 'id')
        const validatedReason = validateReason(reason)

        // Authorization check
        const authedUserId = requireAuthUser(ctx, userId)
        const isAdmin = await isUserAdmin(ctx.db, authedUserId)
        if (!isAdmin) {
          throw new GraphQLError('Not authorized: admin access required', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        await ctx.db
          .prepare('UPDATE configs SET status = ?, rejection_reason = ? WHERE id = ?')
          .bind(CONFIG_STATUS.REJECTED, validatedReason, validatedId)
          .run()

        const row = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(validatedId)
          .first<ConfigRow>()

        if (!row) {
          throw new GraphQLError('Config not found', {
            extensions: { code: 'NOT_FOUND' }
          })
        }

        return mapConfigRow(row)
      },
      approveComment: async (
        _: unknown,
        { id, userId }: { id: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedId = validateRequiredId(id, 'id')

        // Authorization check
        const authedUserId = requireAuthUser(ctx, userId)
        const isAdmin = await isUserAdmin(ctx.db, authedUserId)
        if (!isAdmin) {
          throw new GraphQLError('Not authorized: admin access required', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        // Update comment status
        await ctx.db
          .prepare('UPDATE comments SET status = ? WHERE id = ?')
          .bind(COMMENT_STATUS.PUBLISHED, validatedId)
          .run()

        // Mark user as trusted after first approved comment
        const comment = await ctx.db
          .prepare('SELECT author_id FROM comments WHERE id = ?')
          .bind(validatedId)
          .first<{ author_id: string }>()

        if (comment) {
          await ctx.db
            .prepare('UPDATE users SET is_trusted = 1 WHERE id = ?')
            .bind(comment.author_id)
            .run()
        }

        const row = await ctx.db
          .prepare(`
            SELECT c.id, c.content, c.created_at, c.author_id,
                   u.username as author_username, u.avatar_url as author_avatar_url
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
          `)
          .bind(validatedId)
          .first<CommentRow>()

        if (!row) {
          throw new GraphQLError('Comment not found', {
            extensions: { code: 'NOT_FOUND' }
          })
        }

        return {
          id: row.id,
          content: row.content,
          author: {
            id: row.author_id,
            username: row.author_username ?? 'Anonymous',
            avatarUrl: row.author_avatar_url,
          },
          createdAt: row.created_at,
        }
      },
      rejectComment: async (
        _: unknown,
        { id, reason, userId }: { id: string; reason: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedId = validateRequiredId(id, 'id')
        const validatedReason = validateReason(reason)

        // Authorization check
        const authedUserId = requireAuthUser(ctx, userId)
        const isAdmin = await isUserAdmin(ctx.db, authedUserId)
        if (!isAdmin) {
          throw new GraphQLError('Not authorized: admin access required', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        await ctx.db
          .prepare('UPDATE comments SET status = ?, rejection_reason = ? WHERE id = ?')
          .bind(COMMENT_STATUS.REJECTED, validatedReason, validatedId)
          .run()

        return true
      },
      reportContent: async (
        _: unknown,
        { contentType, contentId, reason, userId }: { contentType: string; contentId: string; reason: string; userId: string },
        ctx: GraphQLContext
      ) => {
        const authedUserId = requireAuthUser(ctx, userId)
        const validatedContentId = validateRequiredId(contentId, 'contentId')
        // Validate contentType
        const validContentTypes = ['config', 'comment'] as const
        if (!validContentTypes.includes(contentType as typeof validContentTypes[number])) {
          throw new GraphQLError('Invalid content type. Must be "config" or "comment"', {
            extensions: { code: 'VALIDATION_ERROR' }
          })
        }

        // Validate input
        const validatedReason = validateReason(reason)

        // Prevent self-reporting
        if (contentType === 'config') {
          const config = await ctx.db
            .prepare('SELECT author_id FROM configs WHERE id = ?')
            .bind(validatedContentId)
            .first<{ author_id: string | null }>()
          if (config?.author_id === authedUserId) {
            throw new GraphQLError('You cannot report your own content', {
              extensions: { code: 'FORBIDDEN' }
            })
          }
        } else if (contentType === 'comment') {
          const comment = await ctx.db
            .prepare('SELECT author_id FROM comments WHERE id = ?')
            .bind(validatedContentId)
            .first<{ author_id: string }>()
          if (comment?.author_id === authedUserId) {
            throw new GraphQLError('You cannot report your own content', {
              extensions: { code: 'FORBIDDEN' }
            })
          }
        }

        // Ensure user exists before inserting (reporter_id has FK to users)
        const userExists = await ctx.db
          .prepare('SELECT 1 FROM users WHERE id = ?')
          .bind(authedUserId)
          .first()

        if (!userExists) {
          await ctx.db
            .prepare('INSERT INTO users (id, username, is_trusted, is_admin) VALUES (?, ?, 0, 0)')
            .bind(authedUserId, 'User')
            .run()
        }

        // Check rate limit for reports
        const rateLimit = await checkRateLimit(ctx.db, authedUserId, 'report')
        if (!rateLimit.allowed) {
          throw new RateLimitError('report', RATE_LIMITS.report.max)
        }

        const id = crypto.randomUUID()

        await ctx.db
          .prepare(
          `INSERT INTO reports (id, content_type, content_id, reporter_id, reason, status)
             VALUES (?, ?, ?, ?, ?, CONFIG_STATUS.PENDING)`
          )
          .bind(id, contentType, validatedContentId, authedUserId, validatedReason)
          .run()

        // Flag the content for review
        if (contentType === 'config') {
          await ctx.db
            .prepare('UPDATE configs SET status = ? WHERE id = ? AND status = ?')
            .bind(CONFIG_STATUS.FLAGGED, validatedContentId, CONFIG_STATUS.PUBLISHED)
            .run()
        } else if (contentType === 'comment') {
          await ctx.db
            .prepare('UPDATE comments SET status = ? WHERE id = ? AND status = ?')
            .bind(CONFIG_STATUS.PENDING, validatedContentId, CONFIG_STATUS.PUBLISHED)
            .run()
        }

        return true
      },
      dismissReport: async (
        _: unknown,
        { id, userId }: { id: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedId = validateRequiredId(id, 'id')

        // Authorization check
        const authedUserId = requireAuthUser(ctx, userId)
        const isAdmin = await isUserAdmin(ctx.db, authedUserId)
        if (!isAdmin) {
          throw new GraphQLError('Not authorized: admin access required', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        // Get the report to know what content to restore
        const report = await ctx.db
          .prepare('SELECT content_type, content_id FROM reports WHERE id = ?')
          .bind(validatedId)
          .first<{ content_type: string; content_id: string }>()

        if (!report) {
          return false
        }

        // Mark report as dismissed
        await ctx.db
          .prepare('UPDATE reports SET status = ? WHERE id = ?')
          .bind(REPORT_STATUS.DISMISSED, validatedId)
          .run()

        // Restore content status to published
        if (report.content_type === 'config') {
          await ctx.db
            .prepare('UPDATE configs SET status = ? WHERE id = ? AND status = ?')
            .bind(CONFIG_STATUS.PUBLISHED, report.content_id, CONFIG_STATUS.FLAGGED)
            .run()
        } else if (report.content_type === 'comment') {
          await ctx.db
            .prepare('UPDATE comments SET status = ? WHERE id = ? AND status = ?')
            .bind(COMMENT_STATUS.PUBLISHED, report.content_id, COMMENT_STATUS.PENDING)
            .run()
        }

        return true
      },
      deleteConfig: async (
        _: unknown,
        { id, userId }: { id: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Validate input
        const validatedId = validateRequiredId(id, 'id')
        const authedUserId = requireAuthUser(ctx, userId)

        // Get the config to check ownership
        const config = await ctx.db
          .prepare('SELECT author_id FROM configs WHERE id = ?')
          .bind(validatedId)
          .first<{ author_id: string | null }>()

        if (!config) {
          throw new GraphQLError('Config not found', {
            extensions: { code: 'NOT_FOUND' }
          })
        }

        // Check if user is owner or admin
        const isOwner = config.author_id === authedUserId
        const isAdmin = await isUserAdmin(ctx.db, authedUserId)

        if (!isOwner && !isAdmin) {
          throw new GraphQLError('Not authorized to delete this config', {
            extensions: { code: 'FORBIDDEN' }
          })
        }

        // Soft delete by setting status to deleted
        await ctx.db
          .prepare('UPDATE configs SET status = ? WHERE id = ?')
          .bind(CONFIG_STATUS.DELETED, validatedId)
          .run()

        return true
      },
    },
    Config: {
      comments: async (parent: { id: string }, _args: unknown, ctx: GraphQLContext) => {
        const result = await ctx.db
          .prepare(`
            SELECT c.id, c.content, c.created_at, c.author_id,
                   u.username as author_username, u.avatar_url as author_avatar_url
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.config_id = ? AND c.status = ?
            ORDER BY c.created_at ASC
          `)
          .bind(parent.id, CONFIG_STATUS.PUBLISHED)
          .all<CommentRow>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          content: row.content,
          author: {
            id: row.author_id,
            username: row.author_username ?? 'Anonymous',
            avatarUrl: row.author_avatar_url,
          },
          createdAt: row.created_at,
        }))
      },
      forkedFrom: async (parent: { forked_from_id: string | null }, _args: unknown, ctx: GraphQLContext) => {
        if (!parent.forked_from_id) return null

        const result = await ctx.db
          .prepare('SELECT id, slug, title FROM configs WHERE id = ?')
          .bind(parent.forked_from_id)
          .first<{ id: string; slug: string; title: string }>()

        return result || null
      },
    },
  },
})
