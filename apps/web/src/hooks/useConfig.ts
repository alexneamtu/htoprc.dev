import { useQuery } from 'urql'
import { CONFIG_QUERY } from '../graphql/queries'
import type { ConfigWithComments } from '../graphql/types'

export interface ConfigData {
  config: ConfigWithComments | null
}

export interface UseConfigOptions {
  id?: string
  slug?: string
}

export function useConfig(options: UseConfigOptions) {
  const { id, slug } = options

  const [result] = useQuery<ConfigData>({
    query: CONFIG_QUERY,
    variables: { id, slug },
    pause: !id && !slug,
  })

  return result
}

// Re-export types for backwards compatibility
export type { Comment, ForkedFromConfig, ConfigWithComments } from '../graphql/types'
