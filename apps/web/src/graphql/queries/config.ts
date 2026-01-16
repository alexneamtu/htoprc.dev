export const CONFIG_QUERY = /* GraphQL */ `
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

export const CONFIGS_QUERY = /* GraphQL */ `
  query Configs($page: Int, $limit: Int, $sort: ConfigSort, $minScore: Int, $search: String, $level: CustomizationLevel) {
    configs(page: $page, limit: $limit, sort: $sort, minScore: $minScore, search: $search, level: $level) {
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

export const TOP_CONFIGS_QUERY = /* GraphQL */ `
  query TopConfigs($limit: Int) {
    configs(limit: $limit, sort: SCORE_DESC) {
      nodes {
        id
        slug
        title
        content
        score
        likesCount
      }
    }
  }
`

export const RECENT_CONFIGS_QUERY = /* GraphQL */ `
  query RecentConfigs($limit: Int) {
    recentConfigs(limit: $limit) {
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

export const MY_CONFIGS_QUERY = /* GraphQL */ `
  query MyConfigs($userId: ID!) {
    myConfigs(userId: $userId) {
      id
      slug
      title
      content
      status
      score
      createdAt
    }
  }
`

export const LIKED_CONFIGS_QUERY = /* GraphQL */ `
  query LikedConfigs($userId: ID!) {
    likedConfigs(userId: $userId) {
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
