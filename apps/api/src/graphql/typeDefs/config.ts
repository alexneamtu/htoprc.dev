export const configTypeDefs = /* GraphQL */ `
  type Config {
    id: ID!
    slug: String!
    title: String!
    content: String!
    sourceType: String!
    sourceUrl: String
    sourcePlatform: String
    authorId: ID
    forkedFromId: ID
    forkedFrom: ForkedFromConfig
    status: String!
    score: Int!
    likesCount: Int!
    createdAt: String!
    comments: [Comment!]!
  }

  type ForkedFromConfig {
    id: ID!
    slug: String!
    title: String!
  }

  type ConfigConnection {
    nodes: [Config!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input UploadConfigInput {
    title: String!
    content: String!
    userId: ID
    forkedFromId: ID
  }
`
