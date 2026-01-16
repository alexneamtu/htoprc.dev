import { useQuery } from 'urql'
import { CONFIGS_QUERY } from '../graphql/queries'
import type { Config, PageInfo } from '../graphql/types'

export interface ConfigsData {
  configs: {
    nodes: Config[]
    totalCount: number
    pageInfo: PageInfo
  }
}

export type ConfigSort = 'SCORE_DESC' | 'LIKES_DESC' | 'CREATED_DESC' | 'CREATED_ASC'
export type CustomizationLevel = 'ALL' | 'MINIMAL' | 'MODERATE' | 'HEAVY'

export interface UseConfigsOptions {
  page?: number
  limit?: number
  sort?: ConfigSort
  minScore?: number
  search?: string
  level?: CustomizationLevel
}

export function useConfigs(options: UseConfigsOptions = {}) {
  const { page = 1, limit = 20, sort = 'SCORE_DESC', minScore = 0, search, level = 'ALL' } = options

  const [result] = useQuery<ConfigsData>({
    query: CONFIGS_QUERY,
    variables: { page, limit, sort, minScore, search: search || undefined, level },
  })

  return result
}

// Re-export types for backwards compatibility
export type { Config, PageInfo }
