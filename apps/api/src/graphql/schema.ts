import { createSchema } from 'graphql-yoga'
import { parseHtoprc } from '@htoprc/parser'

// SHA-256 hash using Web Crypto API (compatible with Cloudflare Workers)
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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
      adminStats: AdminStats!
      pendingConfigs: [Config!]!
      pendingComments: [PendingComment!]!
    }

    type Mutation {
      uploadConfig(input: UploadConfigInput!): Config!
      toggleLike(configId: ID!, userId: ID!): LikeResult!
      addComment(configId: ID!, userId: ID!, content: String!): Comment!
      approveConfig(id: ID!): Config!
      rejectConfig(id: ID!, reason: String!): Config!
      approveComment(id: ID!): Comment!
      rejectComment(id: ID!, reason: String!): Boolean!
    }

    type AdminStats {
      totalConfigs: Int!
      publishedConfigs: Int!
      pendingConfigs: Int!
      totalComments: Int!
      pendingComments: Int!
      totalLikes: Int!
    }

    type PendingComment {
      id: ID!
      content: String!
      configId: ID!
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
      status: String!
      score: Int!
      likesCount: Int!
      createdAt: String!
      comments: [Comment!]!
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
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))
      },
      adminStats: async (_: unknown, _args: unknown, ctx: GraphQLContext) => {
        const [totalConfigs, publishedConfigs, pendingConfigs, totalComments, pendingComments, totalLikes] =
          await Promise.all([
            ctx.db.prepare('SELECT COUNT(*) as count FROM configs').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM configs WHERE status = ?').bind('published').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM configs WHERE status = ?').bind('pending').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM comments').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM comments WHERE status = ?').bind('pending').first<{ count: number }>(),
            ctx.db.prepare('SELECT COUNT(*) as count FROM likes').first<{ count: number }>(),
          ])

        return {
          totalConfigs: totalConfigs?.count ?? 0,
          publishedConfigs: publishedConfigs?.count ?? 0,
          pendingConfigs: pendingConfigs?.count ?? 0,
          totalComments: totalComments?.count ?? 0,
          pendingComments: pendingComments?.count ?? 0,
          totalLikes: totalLikes?.count ?? 0,
        }
      },
      pendingConfigs: async (_: unknown, _args: unknown, ctx: GraphQLContext) => {
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
          status: row.status,
          score: row.score,
          likesCount: row.likes_count,
          createdAt: row.created_at,
        }))
      },
      pendingComments: async (_: unknown, _args: unknown, ctx: GraphQLContext) => {
        const result = await ctx.db
          .prepare(`
            SELECT c.id, c.content, c.config_id, c.author_id, c.created_at,
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
            config_title: string
            author_id: string
            author_username: string
            created_at: string
          }>()

        return (result.results ?? []).map((row) => ({
          id: row.id,
          content: row.content,
          configId: row.config_id,
          configTitle: row.config_title ?? 'Unknown',
          authorId: row.author_id,
          authorUsername: row.author_username ?? 'Anonymous',
          createdAt: row.created_at,
        }))
      },
    },
    Mutation: {
      uploadConfig: async (
        _: unknown,
        { input }: { input: { title: string; content: string } },
        ctx: GraphQLContext
      ) => {
        // Parse the config to calculate score and detect version
        const parsed = parseHtoprc(input.content)

        const id = crypto.randomUUID()
        const slug = input.title.toLowerCase().replace(/\s+/g, '-')
        const contentHash = await sha256(input.content)
        const createdAt = new Date().toISOString()

        await ctx.db
          .prepare(
            `INSERT INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            slug,
            input.title,
            input.content,
            contentHash,
            'uploaded',
            parsed.score,
            parsed.config.htopVersion ?? null,
            'published',
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
          status: 'published',
          score: parsed.score,
          likesCount: 0,
          createdAt,
        }
      },
      toggleLike: async (
        _: unknown,
        { configId, userId }: { configId: string; userId: string },
        ctx: GraphQLContext
      ) => {
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
        { configId, userId, content }: { configId: string; userId: string; content: string },
        ctx: GraphQLContext
      ) => {
        const id = crypto.randomUUID()
        const createdAt = new Date().toISOString()

        // Check if user is trusted (auto-publish) or needs moderation
        const user = await ctx.db
          .prepare('SELECT is_trusted, username, avatar_url FROM users WHERE id = ?')
          .bind(userId)
          .first<{ is_trusted: number; username: string; avatar_url: string | null }>()

        // If user doesn't exist, create them with basic info
        const username = user?.username ?? 'Anonymous'
        const avatarUrl = user?.avatar_url ?? null
        const status = user?.is_trusted ? 'published' : 'pending'

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
            username,
            avatarUrl,
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
    },
  },
})
