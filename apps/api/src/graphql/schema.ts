import { createSchema } from 'graphql-yoga'

// Simple initial schema - will be expanded with Pothos later
export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      health: Health!
      configs(page: Int = 1, limit: Int = 20): ConfigConnection!
      config(id: ID, slug: String): Config
    }

    type Mutation {
      uploadConfig(input: UploadConfigInput!): Config!
    }

    type Health {
      status: String!
      timestamp: String!
    }

    type Config {
      id: ID!
      slug: String!
      title: String!
      content: String!
      sourceType: String!
      sourceUrl: String
      sourcePlatform: String
      status: String!
      score: Int!
      likesCount: Int!
      createdAt: String!
    }

    type ConfigConnection {
      nodes: [Config!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      page: Int!
      totalPages: Int!
    }

    input UploadConfigInput {
      title: String!
      content: String!
    }
  `,
  resolvers: {
    Query: {
      health: () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
      configs: () => ({
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          page: 1,
          totalPages: 0,
        },
        totalCount: 0,
      }),
      config: () => null,
    },
    Mutation: {
      uploadConfig: (_: unknown, { input }: { input: { title: string; content: string } }) => {
        // Placeholder - will implement with database
        return {
          id: crypto.randomUUID(),
          slug: input.title.toLowerCase().replace(/\s+/g, '-'),
          title: input.title,
          content: input.content,
          sourceType: 'uploaded',
          sourceUrl: null,
          sourcePlatform: null,
          status: 'published',
          score: 0,
          likesCount: 0,
          createdAt: new Date().toISOString(),
        }
      },
    },
  },
})
