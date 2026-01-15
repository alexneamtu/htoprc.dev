import { verifyToken } from '@clerk/backend'

/**
 * Authentication and authorization utilities
 */

export type AuthContext = { userId: string }
export type AuthVerifier = (token: string, secretKey: string) => Promise<AuthContext | null>

export const verifyClerkToken: AuthVerifier = async (token, secretKey) => {
  try {
    const payload = await verifyToken(token, { secretKey })
    const userId = payload.sub
    if (!userId) return null
    return { userId }
  } catch {
    return null
  }
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1]?.trim() : null
}

export async function getAuthFromRequest(
  request: Request,
  secretKey?: string,
  verifyAuth: AuthVerifier = verifyClerkToken
): Promise<AuthContext | null> {
  const token = getBearerToken(request)
  if (!token || !secretKey) return null
  return verifyAuth(token, secretKey)
}

/**
 * Check if a user has admin privileges
 */
export async function isUserAdmin(db: D1Database, userId: string): Promise<boolean> {
  if (!userId) return false

  const user = await db
    .prepare('SELECT is_admin FROM users WHERE id = ?')
    .bind(userId)
    .first<{ is_admin: number }>()

  return user?.is_admin === 1
}

/**
 * Check if a user is trusted (for rate limiting bypass)
 */
export async function isUserTrusted(db: D1Database, userId: string): Promise<boolean> {
  if (!userId) return false

  const user = await db
    .prepare('SELECT is_trusted FROM users WHERE id = ?')
    .bind(userId)
    .first<{ is_trusted: number }>()

  return user?.is_trusted === 1
}
