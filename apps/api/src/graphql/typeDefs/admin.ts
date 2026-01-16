export const adminTypeDefs = /* GraphQL */ `
  type AdminStats {
    totalConfigs: Int!
    publishedConfigs: Int!
    pendingConfigs: Int!
    totalComments: Int!
    pendingComments: Int!
    totalLikes: Int!
    pendingReports: Int!
  }

  type Report {
    id: ID!
    contentType: String!
    contentId: ID!
    contentSlug: String
    contentTitle: String
    reason: String!
    createdAt: String!
  }
`
