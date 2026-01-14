import { useQuery } from 'urql'

const CONFIGS_QUERY = /* GraphQL */ `
  query Configs($page: Int, $limit: Int, $sort: ConfigSort, $minScore: Int, $search: String) {
    configs(page: $page, limit: $limit, sort: $sort, minScore: $minScore, search: $search) {
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

export type ConfigSort = 'SCORE_DESC' | 'LIKES_DESC' | 'CREATED_DESC' | 'CREATED_ASC'

export interface UseConfigsOptions {
  page?: number
  limit?: number
  sort?: ConfigSort
  minScore?: number
  search?: string
}

export function useConfigs(options: UseConfigsOptions = {}) {
  const { page = 1, limit = 20, sort = 'SCORE_DESC', minScore = 0, search } = options

  const [result] = useQuery<ConfigsData>({
    query: CONFIGS_QUERY,
    variables: { page, limit, sort, minScore, search: search || undefined },
  })

  return result
}
