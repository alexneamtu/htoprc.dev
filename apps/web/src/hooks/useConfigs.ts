import { useQuery } from 'urql'

const CONFIGS_QUERY = /* GraphQL */ `
  query Configs($page: Int, $limit: Int) {
    configs(page: $page, limit: $limit) {
      nodes {
        id
        slug
        title
        content
        sourceType
        sourceUrl
        sourcePlatform
        status
        score
        likesCount
        createdAt
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        page
        totalPages
      }
    }
  }
`

export interface Config {
  id: string
  slug: string
  title: string
  content: string
  sourceType: string
  sourceUrl: string | null
  sourcePlatform: string | null
  status: string
  score: number
  likesCount: number
  createdAt: string
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  page: number
  totalPages: number
}

export interface ConfigsData {
  configs: {
    nodes: Config[]
    totalCount: number
    pageInfo: PageInfo
  }
}

export interface UseConfigsOptions {
  page?: number
  limit?: number
}

export function useConfigs(options: UseConfigsOptions = {}) {
  const { page = 1, limit = 20 } = options

  const [result] = useQuery<ConfigsData>({
    query: CONFIGS_QUERY,
    variables: { page, limit },
  })

  return result
}
