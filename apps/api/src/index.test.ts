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

    it('responds to recentConfigs query', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ recentConfigs(limit: 5) { id title slug } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type RecentConfigsResponse = {
        recentConfigs: Array<{ id: string; title: string; slug: string }>
      }
      const data = (await res.json()) as GraphQLResponse<RecentConfigsResponse>
      expect(data.data.recentConfigs).toEqual([])
    })

    it('responds to configs query with sort parameter', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query:
              '{ configs(sort: CREATED_DESC, limit: 10) { nodes { id } totalCount } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: unknown[]; totalCount: number }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to configs query with minScore filter', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(minScore: 10) { nodes { id } totalCount } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: unknown[]; totalCount: number }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to configs query with search parameter', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(search: "minimal") { nodes { id } totalCount } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: unknown[]; totalCount: number }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to configs query with level filter MINIMAL', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(level: MINIMAL) { nodes { id } totalCount } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: unknown[]; totalCount: number }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to configs query with level filter MODERATE', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(level: MODERATE) { nodes { id } totalCount } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: unknown[]; totalCount: number }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to configs query with level filter HEAVY', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(level: HEAVY) { nodes { id } totalCount } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: unknown[]; totalCount: number }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to isAdmin query when not admin', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ isAdmin(userId: "user_123") }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type IsAdminResponse = { isAdmin: boolean }
      const data = (await res.json()) as GraphQLResponse<IsAdminResponse>
      // User is not admin by default
      expect(data.data.isAdmin).toBe(false)
    })

    it('responds to hasLiked query', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ hasLiked(configId: "config-1", userId: "user_123") }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type HasLikedResponse = { hasLiked: boolean }
      const data = (await res.json()) as GraphQLResponse<HasLikedResponse>
      expect(data.data.hasLiked).toBe(false)
    })

    it('rejects isAdmin query without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ isAdmin(userId: "user_123") }',
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ isAdmin: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects hasLiked query without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ hasLiked(configId: "config-1", userId: "user_123") }',
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ hasLiked: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('handles pagination in configs query', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(page: 2, limit: 10) { nodes { id } pageInfo { page hasNextPage hasPreviousPage totalPages } } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: {
          nodes: unknown[]
          pageInfo: { page: number; hasNextPage: boolean; hasPreviousPage: boolean; totalPages: number }
        }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs.pageInfo.page).toBe(2)
      expect(data.data.configs.pageInfo.hasPreviousPage).toBe(true)
    })

    it('handles sort by likes_count', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(sort: LIKES_DESC) { nodes { id likesCount } } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: Array<{ id: string; likesCount: number }> }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('handles sort by created_at ascending', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ configs(sort: CREATED_ASC) { nodes { id } } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigsResponse = {
        configs: { nodes: Array<{ id: string }> }
      }
      const data = (await res.json()) as GraphQLResponse<ConfigsResponse>
      expect(data.data.configs).toBeDefined()
    })

    it('responds to myConfigs query with auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ myConfigs(userId: "user_123") { id title } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type MyConfigsResponse = {
        myConfigs: Array<{ id: string; title: string }>
      }
      const data = (await res.json()) as GraphQLResponse<MyConfigsResponse>
      expect(data.data.myConfigs).toEqual([])
    })

    it('responds to likedConfigs query with auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ likedConfigs(userId: "user_123") { id title } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type LikedConfigsResponse = {
        likedConfigs: Array<{ id: string; title: string }>
      }
      const data = (await res.json()) as GraphQLResponse<LikedConfigsResponse>
      expect(data.data.likedConfigs).toEqual([])
    })

    it('responds to myPendingComments query with auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ myPendingComments(configId: "config-1", userId: "user_123") { id content } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type MyPendingCommentsResponse = {
        myPendingComments: Array<{ id: string; content: string }>
      }
      const data = (await res.json()) as GraphQLResponse<MyPendingCommentsResponse>
      expect(data.data.myPendingComments).toEqual([])
    })

    it('responds to adminStats query when not admin', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ adminStats(userId: "user_123") { totalConfigs } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type AdminStatsResponse = {
        adminStats: { totalConfigs: number } | null
      }
      const data = (await res.json()) as GraphQLResponse<AdminStatsResponse>
      // Non-admin user gets null
      expect(data.data.adminStats).toBeNull()
    })

    it('responds to pendingConfigs query when not admin', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ pendingConfigs(userId: "user_123") { id title } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type PendingConfigsResponse = {
        pendingConfigs: Array<{ id: string; title: string }>
      }
      const data = (await res.json()) as GraphQLResponse<PendingConfigsResponse>
      // Non-admin user gets empty array
      expect(data.data.pendingConfigs).toEqual([])
    })

    it('responds to pendingComments query when not admin', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ pendingComments(userId: "user_123") { id content } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type PendingCommentsResponse = {
        pendingComments: Array<{ id: string; content: string }>
      }
      const data = (await res.json()) as GraphQLResponse<PendingCommentsResponse>
      // Non-admin user gets empty array
      expect(data.data.pendingComments).toEqual([])
    })

    it('responds to pendingReports query when not admin', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: '{ pendingReports(userId: "user_123") { id reason } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type PendingReportsResponse = {
        pendingReports: Array<{ id: string; reason: string }>
      }
      const data = (await res.json()) as GraphQLResponse<PendingReportsResponse>
      // Non-admin user gets empty array
      expect(data.data.pendingReports).toEqual([])
    })

    it('returns null for config query without id or slug', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: '{ config { id } }',
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type ConfigResponse = { config: null }
      const data = (await res.json()) as GraphQLResponse<ConfigResponse>
      expect(data.data.config).toBeNull()
    })

    it('handles authenticated upload for trusted user', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Auth Config",
                  content: "htop_version=3.2.1",
                  userId: "user_123"
                }) {
                  id
                  title
                  status
                  authorId
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
          title: string
          status: string
          authorId: string
        }
      }
      const data = (await res.json()) as GraphQLResponse<UploadConfigResponse>
      expect(data.data.uploadConfig.title).toBe('Auth Config')
      expect(data.data.uploadConfig.authorId).toBe('user_123')
    })

    it('rejects toggleLike mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                toggleLike(configId: "config-1", userId: "user_123") {
                  liked
                  likesCount
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ toggleLike: { liked: boolean } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects forkConfig mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                forkConfig(id: "config-1", title: "My Fork", userId: "user_123") {
                  id
                  title
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ forkConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects addComment mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                addComment(configId: "config-1", userId: "user_123", content: "Nice config!") {
                  id
                  content
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ addComment: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects updateConfig mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                updateConfig(id: "config-1", content: "htop_version=3", userId: "user_123") {
                  id
                  content
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ updateConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects approveConfig mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                approveConfig(id: "config-1", userId: "user_123") {
                  id
                  status
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ approveConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects rejectConfig mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                rejectConfig(id: "config-1", reason: "Spam", userId: "user_123") {
                  id
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ rejectConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects reportContent mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                reportContent(contentType: "config", contentId: "config-1", reason: "Spam", userId: "user_123")
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ reportContent: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects deleteConfig mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                deleteConfig(id: "config-1", userId: "user_123")
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ deleteConfig: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects dismissReport mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                dismissReport(id: "report-1", userId: "user_123")
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ dismissReport: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects approveComment mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                approveComment(id: "comment-1", userId: "user_123") {
                  id
                }
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ approveComment: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('rejects rejectComment mutation without auth', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                rejectComment(id: "comment-1", reason: "Spam", userId: "user_123")
              }
            `,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ rejectComment: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('handles upload with forked from id', async () => {
      // First, create an original config to fork from
      const originalRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Original Config",
                  content: "htop_version=3.2.1"
                }) {
                  id
                }
              }
            `,
          }),
        },
        testEnv
      )
      const originalData = (await originalRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const originalId = originalData.data.uploadConfig.id

      // Update the original config to published status (required for forking)
      // Direct manipulation of mock data since mock doesn't support UPDATE queries
      const originalConfig = (mockDB as unknown as { _data: { configs: Array<{ id: string; status: string }> } })._data.configs.find(
        (c) => c.id === originalId
      )
      if (originalConfig) {
        originalConfig.status = 'published'
      }

      // Now create the forked config
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation($forkedFromId: ID!) {
                uploadConfig(input: {
                  title: "Forked Config",
                  content: "htop_version=3.2.1",
                  forkedFromId: $forkedFromId
                }) {
                  id
                  title
                  forkedFromId
                }
              }
            `,
            variables: { forkedFromId: originalId },
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)

      type UploadConfigResponse = {
        uploadConfig: {
          id: string
          title: string
          forkedFromId: string
        }
      }
      const data = (await res.json()) as GraphQLResponse<UploadConfigResponse>
      expect(data.data.uploadConfig.title).toBe('Forked Config')
      expect(data.data.uploadConfig.forkedFromId).toBe(originalId)
    })

    it('handles slug collision with unique slug generation', async () => {
      // First upload
      await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Duplicate Title",
                  content: "htop_version=3.2.1"
                }) { id slug }
              }
            `,
          }),
        },
        testEnv
      )

      // Second upload with same title
      const res2 = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `
              mutation {
                uploadConfig(input: {
                  title: "Duplicate Title",
                  content: "htop_version=3.2.2"
                }) { id slug }
              }
            `,
          }),
        },
        testEnv
      )

      type UploadResponse = { uploadConfig: { id: string; slug: string } }
      const data2 = (await res2.json()) as GraphQLResponse<UploadResponse>
      // Slug should have a suffix to make it unique
      expect(data2.data.uploadConfig.slug).toMatch(/^duplicate-title/)
    })
  })

  describe('Admin endpoints', () => {
    it('rejects admin scrape without auth', async () => {
      const res = await app.request('/api/admin/scrape', { method: 'POST' }, testEnv)
      expect(res.status).toBe(401)
    })

    it('rejects admin scraper-logs without auth', async () => {
      const res = await app.request('/api/admin/scraper-logs', {}, testEnv)
      expect(res.status).toBe(401)

      const data = (await res.json()) as ErrorResponse
      expect(data.error).toContain('Unauthorized')
    })

    it('rejects admin scrape for non-admin user', async () => {
      const res = await app.request(
        '/api/admin/scrape',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer valid-token' },
        },
        testEnv
      )
      expect(res.status).toBe(403)

      const data = (await res.json()) as ErrorResponse
      expect(data.error).toContain('Admin')
    })

    it('rejects admin scraper-logs for non-admin user', async () => {
      const res = await app.request(
        '/api/admin/scraper-logs',
        {
          headers: { Authorization: 'Bearer valid-token' },
        },
        testEnv
      )
      expect(res.status).toBe(403)

      const data = (await res.json()) as ErrorResponse
      expect(data.error).toContain('Admin')
    })
  })

  describe('Sitemap', () => {
    it('returns XML sitemap', async () => {
      const res = await app.request('/sitemap.xml', {}, testEnv)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/xml')

      const xml = await res.text()
      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<urlset')
      expect(xml).toContain('https://htoprc.dev')
    })
  })

  describe('CORS', () => {
    it('allows localhost origins for development', async () => {
      const res = await app.request(
        '/api/health',
        {
          headers: { Origin: 'http://localhost:5173' },
        },
        testEnv
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    })

    it('allows production origin', async () => {
      const res = await app.request(
        '/api/health',
        {
          headers: { Origin: 'https://htoprc.dev' },
        },
        testEnv
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://htoprc.dev')
    })

    it('allows Cloudflare Pages preview URLs', async () => {
      const res = await app.request(
        '/api/health',
        {
          headers: { Origin: 'https://abc123.htoprc-staging.pages.dev' },
        },
        testEnv
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://abc123.htoprc-staging.pages.dev'
      )
    })

    it('defaults to primary origin for unknown origins', async () => {
      const res = await app.request(
        '/api/health',
        {
          headers: { Origin: 'https://malicious.com' },
        },
        testEnv
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://htoprc.dev')
    })
  })

  describe('Security headers', () => {
    it('includes security headers in response', async () => {
      const res = await app.request('/api/health', {}, testEnv)

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Authenticated mutations', () => {
    it('handles toggleLike mutation with auth - adding like', async () => {
      // Upload a config first
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Like Test", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )
      const uploadData = (await uploadRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const configId = uploadData.data.uploadConfig.id

      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { toggleLike(configId: "${configId}", userId: "user_123", username: "testuser") { liked likesCount } }`,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as GraphQLResponse<{ toggleLike: { liked: boolean; likesCount: number } }>
      expect(data.data.toggleLike.liked).toBe(true)
    })

    it('handles addComment mutation with auth', async () => {
      // Upload a config first
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Comment Test", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )
      const uploadData = (await uploadRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const configId = uploadData.data.uploadConfig.id

      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { addComment(configId: "${configId}", userId: "user_123", content: "Nice config!", username: "testuser", avatarUrl: "https://example.com/avatar.png") { id content author { id username } } }`,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as GraphQLResponse<{ addComment: { id: string; content: string; author: { id: string; username: string } } }>
      expect(data.data.addComment.content).toBe('Nice config!')
      expect(data.data.addComment.author.username).toBe('testuser')
    })

    it('rejects forkConfig for non-existent config', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { forkConfig(id: "non-existent", title: "My Fork", userId: "user_123") { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ forkConfig: { id: string } }>
      expect(data.errors).toBeDefined()
      expect(data.errors?.[0]?.message).toContain('not found')
    })

    it('rejects updateConfig for non-existent config', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { updateConfig(id: "non-existent", content: "htop_version=3", userId: "user_123") { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ updateConfig: { id: string } }>
      expect(data.errors).toBeDefined()
      expect(data.errors?.[0]?.message).toContain('not found')
    })

    it('rejects deleteConfig for non-existent config', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { deleteConfig(id: "non-existent", userId: "user_123") }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ deleteConfig: boolean }>
      expect(data.errors).toBeDefined()
    })

    it('rejects reportContent with invalid content type', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { reportContent(contentType: "invalid", contentId: "test-id", reason: "Spam content", userId: "user_123") }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ reportContent: boolean }>
      expect(data.errors).toBeDefined()
      expect(data.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR')
    })

    it('handles reportContent mutation for config', async () => {
      // Upload a config first (anonymous so we can report it)
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Report Test", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )
      const uploadData = (await uploadRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const configId = uploadData.data.uploadConfig.id

      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { reportContent(contentType: "config", contentId: "${configId}", reason: "Spam content", userId: "user_123") }`,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as GraphQLResponse<{ reportContent: boolean }>
      expect(data.data.reportContent).toBe(true)
    })

    it('handles upload mutation with auth mismatched userId', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Test", content: "htop_version=3", userId: "different_user" }) { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })
  })

  describe('Admin mutations', () => {
    it('rejects approveConfig for non-admin user', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { approveConfig(id: "config-1", userId: "user_123") { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ approveConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects rejectConfig for non-admin user', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { rejectConfig(id: "config-1", reason: "Not appropriate", userId: "user_123") { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ rejectConfig: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects approveComment for non-admin user', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { approveComment(id: "comment-1", userId: "user_123") { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ approveComment: { id: string } }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects rejectComment for non-admin user', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { rejectComment(id: "comment-1", reason: "Not appropriate", userId: "user_123") }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ rejectComment: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects dismissReport for non-admin user', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { dismissReport(id: "report-1", userId: "user_123") }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ dismissReport: boolean }>
      expect(data.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('allows deleteConfig for config owner', async () => {
      // Upload a config with auth
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Delete Test", content: "htop_version=3", userId: "user_123" }) { id } }`,
          }),
        },
        testEnv
      )
      const uploadData = (await uploadRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const configId = uploadData.data.uploadConfig.id

      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { deleteConfig(id: "${configId}", userId: "user_123") }`,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as GraphQLResponse<{ deleteConfig: boolean }>
      expect(data.data.deleteConfig).toBe(true)
    })
  })

  describe('Validation', () => {
    it('rejects config upload with empty title', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      expect(data.errors).toBeDefined()
    })

    it('rejects config upload with empty content', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Test", content: "" }) { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      expect(data.errors).toBeDefined()
    })

    it('rejects comment with empty content', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { ...BASE_HEADERS, Authorization: 'Bearer valid-token' },
          body: JSON.stringify({
            query: `mutation { addComment(configId: "config-1", userId: "user_123", content: "") { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ addComment: { id: string } }>
      expect(data.errors).toBeDefined()
    })

    it('handles very long title rejection', async () => {
      const longTitle = 'A'.repeat(201) // Over the 200 char limit
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "${longTitle}", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      expect(data.errors).toBeDefined()
    })
  })

  describe('Config resolver fields', () => {
    it('returns empty comments array for config', async () => {
      // Upload a config
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Comments Test", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )
      const uploadData = (await uploadRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const configId = uploadData.data.uploadConfig.id

      // Mark as published so it can be queried
      const config = mockDB._data.configs.find((c) => (c as { id: string }).id === configId) as { status: string } | undefined
      if (config) config.status = 'published'

      // Query config with comments
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `query { config(id: "${configId}") { id comments { id content } } }`,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as GraphQLResponse<{ config: { id: string; comments: Array<{ id: string; content: string }> } }>
      expect(data.data.config.comments).toEqual([])
    })

    it('returns null for forkedFrom when not forked', async () => {
      // Upload a config
      const uploadRes = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "Not Forked", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )
      const uploadData = (await uploadRes.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      const configId = uploadData.data.uploadConfig.id

      // Mark as published
      const config = mockDB._data.configs.find((c) => (c as { id: string }).id === configId) as { status: string } | undefined
      if (config) config.status = 'published'

      // Query config with forkedFrom
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: BASE_HEADERS,
          body: JSON.stringify({
            query: `query { config(id: "${configId}") { id forkedFrom { id slug title } } }`,
          }),
        },
        testEnv
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as GraphQLResponse<{ config: { id: string; forkedFrom: null } }>
      expect(data.data.config.forkedFrom).toBeNull()
    })
  })

  describe('Rate limiting edge cases', () => {
    it('handles rate limit without IP header gracefully', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // No IP headers
          body: JSON.stringify({
            query: `mutation { uploadConfig(input: { title: "No IP", content: "htop_version=3" }) { id } }`,
          }),
        },
        testEnv
      )

      const data = (await res.json()) as GraphQLResponse<{ uploadConfig: { id: string } }>
      // Should fail because we can't rate limit without IP
      expect(data.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST')
    })
  })
})
