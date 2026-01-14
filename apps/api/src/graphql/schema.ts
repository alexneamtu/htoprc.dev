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

// Database row type
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

// Simple initial schema - will be expanded with Pothos later
export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
    enum ConfigSort {
      SCORE_DESC
      LIKES_DESC
      CREATED_DESC
      CREATED_ASC
    }

    type Query {
      health: Health!
      configs(page: Int = 1, limit: Int = 20, sort: ConfigSort = SCORE_DESC, minScore: Int = 0): ConfigConnection!
      config(id: ID, slug: String): Config
    }

    type Mutation {
      uploadConfig(input: UploadConfigInput!): Config!
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
        }: { page?: number; limit?: number; sort?: string; minScore?: number },
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

        // Get total count
        const countResult = await ctx.db
          .prepare('SELECT COUNT(*) as count FROM configs WHERE status = ? AND score >= ?')
          .bind('published', minScore)
          .first<{ count: number }>()
        const totalCount = countResult?.count ?? 0

        // Get configs
        const result = await ctx.db
          .prepare(
            `SELECT * FROM configs WHERE status = ? AND score >= ? ORDER BY ${orderBy} LIMIT ? OFFSET ?`
          )
          .bind('published', minScore, limit, offset)
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
    },
  },
})
