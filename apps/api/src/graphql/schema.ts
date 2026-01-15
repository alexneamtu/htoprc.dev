import { createSchema } from 'graphql-yoga'
import { GraphQLError } from 'graphql'
import { parseHtoprc } from '@htoprc/parser'

// SHA-256 hash using Web Crypto API (compatible with Cloudflare Workers)
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Generate a unique slug from a title
async function generateUniqueSlug(db: D1Database, title: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    || 'config' // Fallback if title becomes empty

  // Check if base slug exists
  const existing = await db
    .prepare('SELECT slug FROM configs WHERE slug = ? OR slug LIKE ?')
    .bind(baseSlug, `${baseSlug}-%`)
    .all<{ slug: string }>()

  if (!existing.results || existing.results.length === 0) {
    return baseSlug
  }

  // Find the highest suffix number
  const existingSlugs = new Set(existing.results.map(r => r.slug))

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  // Find next available number, add random suffix to avoid race conditions
  let counter = 2
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++
  }

  // Add a small random suffix to prevent race condition collisions
  const randomSuffix = Math.random().toString(36).substring(2, 5)
  return `${baseSlug}-${counter}-${randomSuffix}`
}

// GraphQL context type
interface GraphQLContext {
  db: D1Database
}

// Database row types
interface ConfigRow {
  id: string
  slug: string
  title: string
  content: string
  content_hash: string
  source_type: string
  source_url: string | null
  source_platform: string | null
  author_id: string | null
  forked_from_id: string | null
  status: string
  score: number
  likes_count: number
  htop_version: string | null
  created_at: string
}

interface CommentRow {
  id: string
  config_id: string
  author_id: string
  author_username: string
  author_avatar_url: string | null
  content: string
  status: string
  created_at: string
}

// Rate limit configuration
const RATE_LIMITS = {
  upload: { max: 5, window: 'day' },
  comment: { max: 20, window: 'day' },
} as const

// Rate limiting helper
async function checkRateLimit(
  db: D1Database,
  userId: string,
  actionType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[actionType]
  const today = new Date().toISOString().split('T')[0]

  // Get current count
  const result = await db
    .prepare('SELECT count FROM rate_limits WHERE user_id = ? AND action_type = ? AND action_date = ?')
    .bind(userId, actionType, today)
    .first<{ count: number }>()

  const currentCount = result?.count ?? 0

  if (currentCount >= limit.max) {
    return { allowed: false, remaining: 0 }
  }

  // Increment count
  await db
    .prepare(`
      INSERT INTO rate_limits (user_id, action_type, action_date, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT (user_id, action_type, action_date)
      DO UPDATE SET count = count + 1
    `)
    .bind(userId, actionType, today)
    .run()

  return { allowed: true, remaining: limit.max - currentCount - 1 }
}

class RateLimitError extends GraphQLError {
  constructor(actionType: string, max: number) {
    super(`Rate limit exceeded: You can only perform ${max} ${actionType}(s) per day`, {
      extensions: { code: 'RATE_LIMIT_EXCEEDED' }
    })
  }
}

// Check if user is admin
async function isUserAdmin(db: D1Database, userId: string): Promise<boolean> {
  const user = await db
    .prepare('SELECT is_admin FROM users WHERE id = ?')
    .bind(userId)
    .first<{ is_admin: number }>()
  return user?.is_admin === 1
}

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
      forkConfig(id: ID!, title: String!): Config!
      toggleLike(configId: ID!, userId: ID!, username: String, avatarUrl: String): LikeResult!
      addComment(configId: ID!, userId: ID!, content: String!, username: String, avatarUrl: String): Comment!
      approveConfig(id: ID!): Config!
      rejectConfig(id: ID!, reason: String!): Config!
      approveComment(id: ID!): Comment!
      rejectComment(id: ID!, reason: String!): Boolean!
      reportContent(contentType: String!, contentId: ID!, reason: String!, userId: ID!): Boolean!
      dismissReport(id: ID!): Boolean!
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
        const offset = (page - 1) * limit

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
        const params: (string | number)[] = ['published', minScore]

        if (search && search.trim()) {
          conditions.push('title LIKE ?')
          params.push(`%${search.trim()}%`)
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
          .bind(...params, limit, offset)
          .all<ConfigRow>()

        const nodes = (result.results ?? []).map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          authorId: row.author_id,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))

        const totalPages = Math.ceil(totalCount / limit)

        return {
          nodes,
          pageInfo: {
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            page,
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

        const row = await ctx.db.prepare(query).bind(param, 'published').first<ConfigRow>()

        if (!row) return null

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          authorId: row.author_id,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }
      },
      recentConfigs: async (
        _: unknown,
        { limit = 6 }: { limit?: number },
        ctx: GraphQLContext
      ) => {
        const result = await ctx.db
          .prepare('SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC LIMIT ?')
          .bind('published', limit)
          .all<ConfigRow>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          authorId: row.author_id,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))
      },
      myConfigs: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        const result = await ctx.db
          .prepare('SELECT * FROM configs WHERE author_id = ? AND status != ? ORDER BY created_at DESC')
          .bind(userId, 'deleted')
          .all<ConfigRow>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          authorId: row.author_id,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))
      },
      likedConfigs: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        const result = await ctx.db
          .prepare(`
            SELECT c.* FROM configs c
            INNER JOIN likes l ON c.id = l.config_id
            WHERE l.user_id = ? AND c.status = ?
            ORDER BY l.created_at DESC
          `)
          .bind(userId, 'published')
          .all<ConfigRow>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          authorId: row.author_id,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))
      },
      isAdmin: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        return isUserAdmin(ctx.db, userId)
      },
      hasLiked: async (
        _: unknown,
        { configId, userId }: { configId: string; userId: string },
        ctx: GraphQLContext
      ) => {
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
        const result = await ctx.db
          .prepare(`
            SELECT c.id, c.content, c.created_at, c.author_id,
                   u.username as author_username, u.avatar_url as author_avatar_url
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.config_id = ? AND c.author_id = ? AND c.status = ?
            ORDER BY c.created_at ASC
          `)
          .bind(configId, userId, 'pending')
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
        const admin = await isUserAdmin(ctx.db, userId)
        if (!admin) {
          return null
        }

        const [totalConfigs, publishedConfigs, pendingConfigs, totalComments, pendingComments, totalLikes, pendingReports] =
          await Promise.all([
            ctx.db.prepare('SELECT COUNT(*) as count FROM configs').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM configs WHERE status = ?').bind('published').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM configs WHERE status = ?').bind('pending').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM comments').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM comments WHERE status = ?').bind('pending').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM likes').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM reports WHERE status = ?').bind('pending').first<{ count: number }>(),
          ])

        return {
          totalConfigs: totalConfigs?.count ?? 0,
          publishedConfigs: publishedConfigs?.count ?? 0,
          pendingConfigs: pendingConfigs?.count ?? 0,
          totalComments: totalComments?.count ?? 0,
          pendingComments: pendingComments?.count ?? 0,
          totalLikes: totalLikes?.count ?? 0,
          pendingReports: pendingReports?.count ?? 0,
        }
      },
      pendingConfigs: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        // Only admins can see all pending configs
        const admin = await isUserAdmin(ctx.db, userId)
        if (!admin) {
          return []
        }

        const result = await ctx.db
          .prepare('SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC')
          .bind('pending')
          .all<ConfigRow>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          authorId: row.author_id,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))
      },
      pendingComments: async (
        _: unknown,
        { userId }: { userId: string },
        ctx: GraphQLContext
      ) => {
        // Only admins can see pending comments
        const admin = await isUserAdmin(ctx.db, userId)
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
          .bind('pending')
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
        const admin = await isUserAdmin(ctx.db, userId)
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
          .bind('pending')
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
        // Ensure user exists before rate limiting (rate_limits has FK to users)
        let isTrustedOrAdmin = false
        if (input.userId) {
          const user = await ctx.db
            .prepare('SELECT is_trusted, is_admin FROM users WHERE id = ?')
            .bind(input.userId)
            .first<{ is_trusted: number; is_admin: number }>()

          if (!user) {
            await ctx.db
              .prepare('INSERT INTO users (id, username, is_trusted, is_admin) VALUES (?, ?, 0, 0)')
              .bind(input.userId, 'User')
              .run()
            isTrustedOrAdmin = false
          } else {
            isTrustedOrAdmin = user.is_trusted === 1 || user.is_admin === 1
          }

          // Check rate limit (skip for admins)
          if (!isTrustedOrAdmin) {
            const rateLimit = await checkRateLimit(ctx.db, input.userId, 'upload')
            if (!rateLimit.allowed) {
              throw new RateLimitError('upload', RATE_LIMITS.upload.max)
            }
          }
        }

        // Parse the config to calculate score and detect version
        const parsed = parseHtoprc(input.content)

        const id = crypto.randomUUID()
        const slug = await generateUniqueSlug(ctx.db, input.title)
        const contentHash = await sha256(input.content)
        const createdAt = new Date().toISOString()
        const status = isTrustedOrAdmin ? 'published' : 'pending'

        await ctx.db
          .prepare(
            `INSERT INTO configs (id, slug, title, content, content_hash, source_type, author_id, forked_from_id, score, htop_version, status, likes_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            slug,
            input.title,
            input.content,
            contentHash,
            'uploaded',
            input.userId || null,
            input.forkedFromId || null,
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
          title: input.title,
          content: input.content,
          sourceType: 'uploaded',
          sourceUrl: null,
          sourcePlatform: null,
          authorId: input.userId || null,
          forkedFromId: input.forkedFromId || null,
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
        // Get the existing config
        const existing = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(id)
          .first<ConfigRow>()

        if (!existing) {
          throw new Error('Config not found')
        }

        // Check if user is the author (only uploaded configs can be edited by their author)
        if (existing.source_type !== 'uploaded') {
          throw new Error('Only uploaded configs can be edited')
        }

        // For uploaded configs, check author_id or allow if it's null (legacy)
        if (existing.author_id && existing.author_id !== userId) {
          throw new Error('You can only edit your own configs')
        }

        // Parse the new content to calculate score
        const parsed = parseHtoprc(content)
        const contentHash = await sha256(content)
        const newTitle = title || existing.title

        await ctx.db
          .prepare(
            `UPDATE configs SET title = ?, content = ?, content_hash = ?, score = ?, htop_version = ? WHERE id = ?`
          )
          .bind(
            newTitle,
            content,
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
          content,
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
        { id, title }: { id: string; title: string },
        ctx: GraphQLContext
      ) => {
        // Get the original config
        const original = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(id)
          .first<ConfigRow>()

        if (!original) {
          throw new Error('Config not found')
        }

        // Parse the config to calculate score
        const parsed = parseHtoprc(original.content)

        const newId = crypto.randomUUID()
        const slug = await generateUniqueSlug(ctx.db, title)
        const contentHash = await sha256(original.content)
        const createdAt = new Date().toISOString()

        await ctx.db
          .prepare(
            `INSERT INTO configs (id, slug, title, content, content_hash, source_type, forked_from_id, score, htop_version, status, likes_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newId,
            slug,
            title,
            original.content,
            contentHash,
            'uploaded',
            id,
            parsed.score,
            parsed.config.htopVersion ?? null,
            'published',
            0,
            createdAt
          )
          .run()

        return {
          id: newId,
          slug,
          title,
          content: original.content,
          sourceType: 'uploaded',
          sourceUrl: null,
          sourcePlatform: null,
          forkedFromId: id,
          status: 'published',
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
        // Ensure user exists with proper info
        const userExists = await ctx.db
          .prepare('SELECT 1 FROM users WHERE id = ?')
          .bind(userId)
          .first()

        const finalUsername = username || 'User'

        if (!userExists) {
          await ctx.db
            .prepare('INSERT INTO users (id, username, avatar_url, is_trusted, is_admin) VALUES (?, ?, ?, 0, 0)')
            .bind(userId, finalUsername, avatarUrl || null)
            .run()
        } else if (username || avatarUrl) {
          // Update user info if provided
          await ctx.db
            .prepare('UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
            .bind(username || null, avatarUrl || null, userId)
            .run()
        }

        // Check if already liked
        const existing = await ctx.db
          .prepare('SELECT 1 FROM likes WHERE user_id = ? AND config_id = ?')
          .bind(userId, configId)
          .first()

        if (existing) {
          // Unlike: remove the like
          await ctx.db
            .prepare('DELETE FROM likes WHERE user_id = ? AND config_id = ?')
            .bind(userId, configId)
            .run()

          // Decrement likes count
          await ctx.db
            .prepare('UPDATE configs SET likes_count = likes_count - 1 WHERE id = ?')
            .bind(configId)
            .run()

          const config = await ctx.db
            .prepare('SELECT likes_count FROM configs WHERE id = ?')
            .bind(configId)
            .first<{ likes_count: number }>()

          return {
            liked: false,
            likesCount: config?.likes_count ?? 0,
          }
        } else {
          // Like: add the like
          await ctx.db
            .prepare('INSERT INTO likes (user_id, config_id) VALUES (?, ?)')
            .bind(userId, configId)
            .run()

          // Increment likes count
          await ctx.db
            .prepare('UPDATE configs SET likes_count = likes_count + 1 WHERE id = ?')
            .bind(configId)
            .run()

          const config = await ctx.db
            .prepare('SELECT likes_count FROM configs WHERE id = ?')
            .bind(configId)
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
        // Check if user exists, create or update with provided info
        let user = await ctx.db
          .prepare('SELECT is_trusted, username, avatar_url FROM users WHERE id = ?')
          .bind(userId)
          .first<{ is_trusted: number; username: string; avatar_url: string | null }>()

        const finalUsername = inputUsername || user?.username || 'User'
        const finalAvatarUrl = inputAvatarUrl || user?.avatar_url || null

        if (!user) {
          // Create user with info from Clerk
          await ctx.db
            .prepare('INSERT INTO users (id, username, avatar_url, is_trusted, is_admin) VALUES (?, ?, ?, 0, 0)')
            .bind(userId, finalUsername, finalAvatarUrl)
            .run()
          user = { is_trusted: 0, username: finalUsername, avatar_url: finalAvatarUrl }
        } else if (inputUsername || inputAvatarUrl) {
          // Update user info if provided
          await ctx.db
            .prepare('UPDATE users SET username = ?, avatar_url = ? WHERE id = ?')
            .bind(finalUsername, finalAvatarUrl, userId)
            .run()
        }

        // Check rate limit (skip for admins)
        const userIsAdmin = await isUserAdmin(ctx.db, userId)
        if (!userIsAdmin) {
          const rateLimit = await checkRateLimit(ctx.db, userId, 'comment')
          if (!rateLimit.allowed) {
            throw new RateLimitError('comment', RATE_LIMITS.comment.max)
          }
        }

        const id = crypto.randomUUID()
        const createdAt = new Date().toISOString()

        const status = user.is_trusted ? 'published' : 'pending'

        await ctx.db
          .prepare(
            'INSERT INTO comments (id, config_id, author_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(id, configId, userId, content, status, createdAt)
          .run()

        return {
          id,
          content,
          author: {
            id: userId,
            username: finalUsername,
            avatarUrl: finalAvatarUrl,
          },
          createdAt,
        }
      },
      approveConfig: async (
        _: unknown,
        { id }: { id: string },
        ctx: GraphQLContext
      ) => {
        await ctx.db
          .prepare('UPDATE configs SET status = ? WHERE id = ?')
          .bind('published', id)
          .run()

        const row = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(id)
          .first<ConfigRow>()

        if (!row) throw new Error('Config not found')

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }
      },
      rejectConfig: async (
        _: unknown,
        { id, reason }: { id: string; reason: string },
        ctx: GraphQLContext
      ) => {
        await ctx.db
          .prepare('UPDATE configs SET status = ?, rejection_reason = ? WHERE id = ?')
          .bind('rejected', reason, id)
          .run()

        const row = await ctx.db
          .prepare('SELECT * FROM configs WHERE id = ?')
          .bind(id)
          .first<ConfigRow>()

        if (!row) throw new Error('Config not found')

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          sourcePlatform: row.source_platform,
          forkedFromId: row.forked_from_id,
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }
      },
      approveComment: async (
        _: unknown,
        { id }: { id: string },
        ctx: GraphQLContext
      ) => {
        // Update comment status
        await ctx.db
          .prepare('UPDATE comments SET status = ? WHERE id = ?')
          .bind('published', id)
          .run()

        // Mark user as trusted after first approved comment
        const comment = await ctx.db
          .prepare('SELECT author_id FROM comments WHERE id = ?')
          .bind(id)
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
          .bind(id)
          .first<CommentRow>()

        if (!row) throw new Error('Comment not found')

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
        { id, reason }: { id: string; reason: string },
        ctx: GraphQLContext
      ) => {
        await ctx.db
          .prepare('UPDATE comments SET status = ?, rejection_reason = ? WHERE id = ?')
          .bind('rejected', reason, id)
          .run()

        return true
      },
      reportContent: async (
        _: unknown,
        { contentType, contentId, reason, userId }: { contentType: string; contentId: string; reason: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Ensure user exists before inserting (reporter_id has FK to users)
        const userExists = await ctx.db
          .prepare('SELECT 1 FROM users WHERE id = ?')
          .bind(userId)
          .first()

        if (!userExists) {
          await ctx.db
            .prepare('INSERT INTO users (id, username, is_trusted, is_admin) VALUES (?, ?, 0, 0)')
            .bind(userId, 'User')
            .run()
        }

        const id = crypto.randomUUID()

        await ctx.db
          .prepare(
            `INSERT INTO reports (id, content_type, content_id, reporter_id, reason, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`
          )
          .bind(id, contentType, contentId, userId, reason)
          .run()

        // Flag the content for review
        if (contentType === 'config') {
          await ctx.db
            .prepare('UPDATE configs SET status = ? WHERE id = ? AND status = ?')
            .bind('flagged', contentId, 'published')
            .run()
        } else if (contentType === 'comment') {
          await ctx.db
            .prepare('UPDATE comments SET status = ? WHERE id = ? AND status = ?')
            .bind('pending', contentId, 'published')
            .run()
        }

        return true
      },
      dismissReport: async (
        _: unknown,
        { id }: { id: string },
        ctx: GraphQLContext
      ) => {
        // Get the report to know what content to restore
        const report = await ctx.db
          .prepare('SELECT content_type, content_id FROM reports WHERE id = ?')
          .bind(id)
          .first<{ content_type: string; content_id: string }>()

        if (!report) {
          return false
        }

        // Mark report as dismissed
        await ctx.db
          .prepare('UPDATE reports SET status = ? WHERE id = ?')
          .bind('dismissed', id)
          .run()

        // Restore content status to published
        if (report.content_type === 'config') {
          await ctx.db
            .prepare('UPDATE configs SET status = ? WHERE id = ? AND status = ?')
            .bind('published', report.content_id, 'flagged')
            .run()
        } else if (report.content_type === 'comment') {
          await ctx.db
            .prepare('UPDATE comments SET status = ? WHERE id = ? AND status = ?')
            .bind('published', report.content_id, 'pending')
            .run()
        }

        return true
      },
      deleteConfig: async (
        _: unknown,
        { id, userId }: { id: string; userId: string },
        ctx: GraphQLContext
      ) => {
        // Get the config to check ownership
        const config = await ctx.db
          .prepare('SELECT author_id FROM configs WHERE id = ?')
          .bind(id)
          .first<{ author_id: string | null }>()

        if (!config) {
          throw new GraphQLError('Config not found')
        }

        // Check if user is owner or admin
        const isOwner = config.author_id === userId
        const isAdmin = await isUserAdmin(ctx.db, userId)

        if (!isOwner && !isAdmin) {
          throw new GraphQLError('Not authorized to delete this config')
        }

        // Soft delete by setting status to 'deleted'
        await ctx.db
          .prepare('UPDATE configs SET status = ? WHERE id = ?')
          .bind('deleted', id)
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
          .bind(parent.id, 'published')
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
