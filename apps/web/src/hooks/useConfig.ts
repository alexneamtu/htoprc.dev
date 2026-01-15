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
      authorId
      forkedFromId
      forkedFrom {
        id
        slug
        title
      }
      status
      score
      likesCount
      createdAt
      comments {
        id
        content
        author {
          id
          username
          avatarUrl
        }
        createdAt
      }
    }
  }
`

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    username: string
    avatarUrl: string | null
  }
  createdAt: string
}

export interface ForkedFromConfig {
  id: string
  slug: string
  title: string
}

export interface ConfigWithComments extends Config {
  forkedFrom: ForkedFromConfig | null
  comments: Comment[]
}

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
