import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown>
}

const SITE_NAME = 'htoprc.dev'
const DEFAULT_TITLE = 'htoprc.dev - Visual htop Configuration Editor'
const DEFAULT_DESCRIPTION =
  'Create, customize, and share beautiful htop configurations. Browse the gallery for inspiration or use the visual editor to build your own.'
const DEFAULT_IMAGE = '/og-image.png'
const BASE_URL = 'https://htoprc.dev'

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`

  // Default JSON-LD for website
  const defaultJsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebSite',
    name: fullTitle,
    description,
    url: fullUrl,
    image: fullImage,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
  }

  const structuredData = jsonLd || defaultJsonLd

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Additional meta */}
      <link rel="canonical" href={fullUrl} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  )
}
