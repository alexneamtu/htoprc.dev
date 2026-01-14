import { useQuery } from 'urql'
import type { Config } from './useConfigs'

const CONFIG_QUERY = /* GraphQL */ `
  query Config($id: ID, $slug: String) {
    config(id: $id, slug: $slug) {
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
  }
`

export interface ConfigData {
  config: Config | null
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
