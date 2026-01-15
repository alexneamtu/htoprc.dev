import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from './index'

// Create a mock D1 database
function createMockDB() {
  const data = {
    configs: [] as unknown[],
    anonRateLimits: new Map<string, number>(),
  }
  const anonKey = (key: string, action: string, date: string) => `${key}:${action}:${date}`

  const mockPrepare = vi.fn((sql: string) => {
    return {
      bind: vi.fn((...args: unknown[]) => ({
        all: vi.fn(async () => {
          // Check COUNT first before generic SELECT
          if (sql.includes('COUNT(*)')) {
            return { results: [{ count: data.configs.length }] }
          }
          if (sql.includes('SELECT') && sql.includes('FROM configs')) {
            if (sql.includes('WHERE id =') || sql.includes('WHERE slug =')) {
              const id = args[0] as string
              const found = data.configs.find(
                (c: unknown) =>
                  (c as { id: string; slug: string }).id === id ||
                  (c as { id: string; slug: string }).slug === id
              )
              return { results: found ? [found] : [] }
            }
            // For SELECT * queries, filter by status if present
            if (sql.includes('WHERE status =')) {
              const status = args[0] as string
              const filtered = data.configs.filter(
                (c: unknown) => (c as { status: string }).status === status
              )
              return { results: filtered }
            }
            return { results: data.configs }
          }
          return { results: [] }
        }),
        first: vi.fn(async () => {
          // Check COUNT first before generic SELECT
          if (sql.includes('COUNT(*)')) {
            return { count: data.configs.length }
          }
          if (sql.includes('FROM anon_rate_limits')) {
            const key = anonKey(args[0] as string, args[1] as string, args[2] as string)
            return { count: data.anonRateLimits.get(key) ?? 0 }
          }
          if (sql.includes('SELECT') && sql.includes('FROM configs')) {
            const id = args[0] as string
            return (
              data.configs.find(
                (c: unknown) =>
                  (c as { id: string; slug: string }).id === id ||
                  (c as { id: string; slug: string }).slug === id
              ) || null
            )
          }
          return null
        }),
        run: vi.fn(async () => {
          if (sql.includes('INSERT INTO anon_rate_limits')) {
            const key = anonKey(args[0] as string, args[1] as string, args[2] as string)
            data.anonRateLimits.set(key, (data.anonRateLimits.get(key) ?? 0) + 1)
            return { success: true }
          }
          if (sql.includes('INSERT INTO configs')) {
            // INSERT INTO configs (id, slug, title, content, content_hash, source_type, author_id, forked_from_id, score, htop_version, status, likes_count, created_at)
            const config = {
              id: args[0],
              slug: args[1],
              title: args[2],
              content: args[3],
              content_hash: args[4],
              source_type: args[5],
              author_id: args[6],
              forked_from_id: args[7],
              score: args[8],
              htop_version: args[9],
              status: args[10],
              likes_count: args[11],
              created_at: args[12],
            }
            data.configs.push(config)
            return { success: true }
          }
          return { success: true }
        }),
      })),
      all: vi.fn(async () => ({ results: [] })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => ({ success: true })),
    }
  })

  return {
    prepare: mockPrepare,
    _data: data,
  } as unknown as D1Database & { _data: typeof data }
}

type GraphQLErrorShape = { message: string; extensions?: { code?: string } }
type GraphQLResponse<T> = { data: T; errors?: GraphQLErrorShape[] }

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'CF-Connecting-IP': '203.0.113.5',
}

let app: ReturnType<typeof createApp>
let mockDB: ReturnType<typeof createMockDB>
let testEnv: { DB: D1Database; CLERK_SECRET_KEY: string; ANON_RATE_LIMIT_SALT: string }

// Type helpers for test assertions
type HealthResponse = { status: string; timestamp: string }
type ErrorResponse = { error: string }
describe('API', () => {
  beforeEach(() => {
    app = createApp({
      verifyAuth: async (token) => (token === 'valid-token' ? { userId: 'user_123' } : null),
    })
    mockDB = createMockDB()
    testEnv = { DB: mockDB, CLERK_SECRET_KEY: 'test-secret', ANON_RATE_LIMIT_SALT: 'test-salt' }
  })

  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const res = await app.request('/api/health', {}, testEnv)

      expect(res.status).toBe(200)

      const data = (await res.json()) as HealthResponse
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('404 handling', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await app.request('/unknown-route', {}, testEnv)

      expect(res.status).toBe(404)

      const data = (await res.json()) as ErrorResponse
      expect(data.error).toBe('Not found')
    })
  })

  describe('GraphQL endpoint', () => {
    it('responds to health query', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ health { status timestamp } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      const data = (await res.json()) as GraphQLResponse<{ health: HealthResponse }>
      expect(data.data.health.status).toBe('ok')
      expect(data.data.health.timestamp).toBeDefined()
    })

    it('responds to configs query', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs { nodes { id } totalCount pageInfo { page } } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: {
          nodes: unknown[]
          totalCount: number
          pageInfo: { page: number }
        }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs.nodes).toEqual([])
      expect(data.data.configs.totalCount).toBe(0)
      expect(data.data.configs.pageInfo.page).toBe(1)
    })

    it('responds to config query with null for non-existent', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ config(id: "non-existent") { id } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      const data = (await res.json()) as GraphQLResponse<{ config: unknown }>
      expect(data.data.config).toBeNull()
    })

    it('rejects user-scoped queries without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: 'query { myConfigs(userId: "user_123") { id } }',
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ myConfigs: unknown }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects user-scoped queries when auth mismatches', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: 'query { myConfigs(userId: "user_999") { id } }',
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ myConfigs: unknown }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('handles uploadConfig mutation', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: { title: "My Config", content: "htop_version=3.2.1" }) {
                  id
                  slug
                  title
                  content
                  sourceType
                  status
                }
              }
            `,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type UploadConfigResponse = {
        uploadConfig: {
          id: string
          slug: string
          title: string
          content: string
          sourceType: string
          status: string
        }
      }
      const data = (await res.json()) as GraphQLResponse<UploadConfigResponse>
      expect(data.data.uploadConfig.id).toBeDefined()
      expect(data.data.uploadConfig.slug).toBe('my-config')
      expect(data.data.uploadConfig.title).toBe('My Config')
      expect(data.data.uploadConfig.content).toBe('htop_version=3.2.1')
      expect(data.data.uploadConfig.sourceType).toBe('uploaded')
      // Anonymous uploads go to pending status for moderation
      expect(data.data.uploadConfig.status).toBe('pending')
    })

    it('rate limits anonymous uploads by IP', async () => {
      const upload = () =>
        app.request(
          '/api/graphql',
          {
            method: 'POST',
            headers: BASE_HEADERS,
            body: JSON.stringify({
              query: `mutation {
                uploadConfig(input: { title: "Anon", content: "htop_version=3.2.1" }) { id }
              }`,
            }),
          },
          testEnv
        )

      for (let i = 0; i < 5; i++) {
        const res = await upload()
        const data = (await res.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
        expect(data.errors).toBeUndefined()
      }

      const blocked = await upload()
      const blockedData = (await blocked.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      expect(blockedData.errors?.[0]?.extensions?.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('calculates score based on config content', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Custom Config",
                  content: "htop_version=3.2.1\\ncolor_scheme=5\\ntree_view=1"
                }) {
                  id
                  score
                }
              }
            `,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ScoreResponse = {
        uploadConfig: {
          id: string
          score: number
        }
      }
      const data = (await res.json()) as GraphQLResponse<ScoreResponse>
      // color_scheme=5 gives +10, tree_view=1 gives +5 = 15
      expect(data.data.uploadConfig.score).toBeGreaterThanOrEqual(10)
    })

    it('retrieves uploaded config by id', async () => {
      // First, upload a config
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Config By ID",
                  content: "htop_version=3.2.1"
                }) { id slug }
              }
            `,
          }),
        },
        testEnv
      )

      const uploadData = (await uploadRes.json()) as GraphQLResponse<{
        uploadConfig: { id: string; slug: string }
      }>
      const uploadedId = uploadData.data.uploadConfig.id

      // Retrieve by id
      const configRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `query { config(id: "${uploadedId}") { id title slug } }`,
          }),
        },
        testEnv
      )

      expect(configRes.status).toBe(200)
      const configData = (await configRes.json()) as GraphQLResponse<{
        config: { id: string; title: string; slug: string } | null
      }>
      expect(configData.data.config).not.toBeNull()
      expect(configData.data.config?.id).toBe(uploadedId)
      expect(configData.data.config?.title).toBe('Config By ID')
    })

    it('retrieves uploaded config by slug', async () => {
      // First, upload a config
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Config By Slug",
                  content: "htop_version=3.2.1"
                }) { id slug }
              }
            `,
          }),
        },
        testEnv
      )

      const uploadData = (await uploadRes.json()) as GraphQLResponse<{
        uploadConfig: { id: string; slug: string }
      }>
      const uploadedSlug = uploadData.data.uploadConfig.slug

      // Retrieve by slug
      const configRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `query { config(slug: "${uploadedSlug}") { id title slug } }`,
          }),
        },
        testEnv
      )

      expect(configRes.status).toBe(200)
      const configData = (await configRes.json()) as GraphQLResponse<{
        config: { id: string; title: string; slug: string } | null
      }>
      expect(configData.data.config).not.toBeNull()
      expect(configData.data.config?.slug).toBe(uploadedSlug)
      expect(configData.data.config?.title).toBe('Config By Slug')
    })

    it('persists uploaded config and retrieves via configs query', async () => {
      // First, upload a config
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Persisted Config",
                  content: "htop_version=3.2.1\\ncolor_scheme=3"
                }) {
                  id
                  slug
                  title
                }
              }
            `,
          }),
        },
        testEnv
      )

      expect(uploadRes.status).toBe(200)
      type UploadResponse = {
        uploadConfig: { id: string; slug: string; title: string }
      }
      const uploadData = (await uploadRes.json()) as GraphQLResponse<UploadResponse>
      const uploadedId = uploadData.data.uploadConfig.id

      // Anonymous uploads go to pending status, so simulate admin approval
      const config = mockDB._data.configs.find(
        (c) => (c as { id: string }).id === uploadedId
      ) as { status: string } | undefined
      if (config) {
        config.status = 'published'
      }

      // Then, retrieve via configs query
      const configsRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs { nodes { id slug title } totalCount } }',
          }),
        },
        testEnv
      )

      expect(configsRes.status).toBe(200)
      type ConfigsResponse = {
        configs: {
          nodes: Array<{ id: string; slug: string; title: string }>
          totalCount: number
        }
      }
      const configsData = (await configsRes.json()) as GraphQLResponse<ConfigsResponse>

      // The uploaded config should be in the list
      expect(configsData.data.configs.totalCount).toBeGreaterThanOrEqual(1)
      const found = configsData.data.configs.nodes.find((c) => c.id === uploadedId)
      expect(found).toBeDefined()
      expect(found?.title).toBe('Persisted Config')
      expect(found?.slug).toBe('persisted-config')
    })
  })

  describe('Admin endpoints', () => {
    it('rejects admin scrape without auth', async () => {
      const res = await app.request('/api/admin/scrape', { method: 'POST' }, testEnv)
      expect(res.status).toBe(401)
    })
  })
})
