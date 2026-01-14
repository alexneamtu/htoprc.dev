import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createYoga } from 'graphql-yoga'
import { schema } from './graphql/schema'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS configuration
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://htoprc.dev',
      'https://htoprc.dev.alexneamtu.top',
      'https://htoprc.staging.alexneamtu.top',
    ],
    credentials: true,
  })
)

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// GraphQL endpoint
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
})

app.on(['GET', 'POST'], '/api/graphql', async (c) => {
  const response = await yoga.handle(c.req.raw, { db: c.env.DB })
  return response
})

// Fallback
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

export default app
