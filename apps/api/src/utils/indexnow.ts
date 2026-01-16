const INDEXNOW_KEY = '536534fb1bfe8531f47bfae5cd734e4a'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const PRODUCTION_HOST = 'htoprc.dev'

/**
 * Checks if a URL is the production environment.
 */
function isProduction(baseUrl?: string): boolean {
  if (!baseUrl) return true // No baseUrl means assume production
  try {
    const url = new URL(baseUrl)
    return url.host === PRODUCTION_HOST || url.host === `www.${PRODUCTION_HOST}`
  } catch {
    return false
  }
}

/**
 * Submits a config page to IndexNow for instant indexing.
 * Only runs for production URLs. Fails silently.
 */
export async function submitConfigToIndexNow(slug: string, baseUrl?: string): Promise<void> {
  // Only submit to IndexNow for production
  if (!isProduction(baseUrl)) {
    return
  }

  const url = `https://${PRODUCTION_HOST}/config/${slug}`

  try {
    const response = await fetch(
      `${INDEXNOW_ENDPOINT}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}&keyLocation=${encodeURIComponent(`https://${PRODUCTION_HOST}/${INDEXNOW_KEY}.txt`)}`,
      { method: 'GET' }
    )

    if (!response.ok) {
      console.error(`IndexNow submission failed for ${url}: ${response.status}`)
    }
  } catch (error) {
    console.error('IndexNow submission error:', error)
  }
}
