export const IS_ADMIN_QUERY = /* GraphQL */ `
  query IsAdmin($userId: ID!) {
    isAdmin(userId: $userId)
  }
`

export const ADMIN_STATS_QUERY = /* GraphQL */ `
  query AdminStats($userId: ID!) {
    adminStats(userId: $userId) {
      totalConfigs
      publishedConfigs
      pendingConfigs
      totalComments
      pendingComments
      totalLikes
      pendingReports
    }
  }
`

export const PENDING_CONFIGS_QUERY = /* GraphQL */ `
  query PendingConfigs($userId: ID!) {
    pendingConfigs(userId: $userId) {
      id
      slug
      title
      content
      score
      createdAt
    }
  }
`

export const PENDING_COMMENTS_QUERY = /* GraphQL */ `
  query PendingComments($userId: ID!) {
    pendingComments(userId: $userId) {
      id
      content
      configId
      configSlug
      configTitle
      authorId
      authorUsername
      createdAt
    }
  }
`

export const PENDING_REPORTS_QUERY = /* GraphQL */ `
  query PendingReports($userId: ID!) {
    pendingReports(userId: $userId) {
      id
      contentType
      contentId
      contentSlug
      contentTitle
      reason
      createdAt
    }
  }
`
