import { secureRandomString } from './random'

/**
 * Generate a URL-safe slug from a title.
 * Returns 'config' if the title becomes empty after sanitization.
 */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'config'
  )
}

/**
 * Generate a unique slug for a config by checking the database.
 * If the base slug already exists, appends a timestamp and random suffix.
 */
export async function generateUniqueSlug(db: D1Database, title: string): Promise<string> {
  const baseSlug = slugify(title)

  const count = await db
    .prepare('SELECT COUNT(*) as count FROM configs WHERE slug = ?')
    .bind(baseSlug)
    .first<{ count: number }>()

  if (!count || count.count === 0) {
    return baseSlug
  }

  const timestamp = Date.now().toString(36)
  const randomSuffix = secureRandomString(4)
  return `${baseSlug}-${timestamp}-${randomSuffix}`
}

/**
 * Generate a slug for scraped content using the source identifier.
 * Always includes a random suffix for uniqueness.
 */
export function generateScrapedSlug(sourceIdentifier: string): string {
  const sanitized = sourceIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  const randomSuffix = secureRandomString(8)
  return `${sanitized}-${randomSuffix}`
}
