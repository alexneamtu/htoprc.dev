import { Hono } from 'hono'
import type { Bindings } from '../types'

export const healthRoutes = new Hono<{ Bindings: Bindings }>()

healthRoutes.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})
