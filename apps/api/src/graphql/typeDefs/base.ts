export const baseTypeDefs = /* GraphQL */ `
  enum ConfigSort {
    SCORE_DESC
    LIKES_DESC
    CREATED_DESC
    CREATED_ASC
  }

  enum CustomizationLevel {
    ALL
    MINIMAL
    MODERATE
    HEAVY
  }

  type Health {
    status: String!
    timestamp: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    page: Int!
    totalPages: Int!
  }

  type LikeResult {
    liked: Boolean!
    likesCount: Int!
  }
`
