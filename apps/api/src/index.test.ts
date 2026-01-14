import { describe, it, expect } from 'vitest'
import app from './index'

// Mock D1 database for testing
const mockDB = {} as D1Database

const testEnv = { DB: mockDB }

// Type helpers for test assertions
type HealthResponse = { status: string; timestamp: string }
type ErrorResponse = { error: string }
type GraphQLResponse<T> = { data: T }

describe('API', () => {
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
          headers: {
            'Content-Type': 'application/json',
          },
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
          headers: {
            'Content-Type': 'application/json',
          },
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
          headers: {
            'Content-Type': 'application/json',
          },
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

    it('handles uploadConfig mutation', async () => {
      const res = await app.request(
        '/api/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
      expect(data.data.uploadConfig.status).toBe('published')
    })
  })
})
