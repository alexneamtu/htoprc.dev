import { createSchema } from 'graphql-yoga'
import { parseHtoprc } from '@htoprc/parser'
import { createHash } from 'crypto'

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
    type Query {
      health: Health!
      configs(page: Int = 1, limit: Int = 20): ConfigConnection!
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
        { page = 1, limit = 20 }: { page?: number; limit?: number },
        ctx: GraphQLContext
      ) => {
        const offset = (page - 1) * limit

        // Get total count
        const countResult = await ctx.db
          .prepare('SELECT COUNT(*) as count FROM configs WHERE status = ?')
          .bind('published')
          .first<{ count: number }>()
        const totalCount = countResult?.count ?? 0

        // Get configs
        const result = await ctx.db
          .prepare(
            'SELECT * FROM configs WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
          )
          .bind('published', limit, offset)
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
        const contentHash = createHash('sha256').update(input.content).digest('hex')
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
            parsed.htopVersion ?? null,
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
