import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

interface BreadcrumbItem {
  name: string
  path: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [{ name: 'Home', path: '/' }, ...items]

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://htoprc.dev${item.path}`,
    })),
  }

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-htop-fg/60">
        <ol className="flex items-center gap-2">
          {allItems.map((item, index) => (
            <li key={item.path} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === allItems.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link to={item.path} className="hover:text-htop-green transition-colors">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
