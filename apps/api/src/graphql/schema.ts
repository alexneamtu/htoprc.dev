import { createSchema } from 'graphql-yoga'
import { type GraphQLContext } from './types'
import { typeDefs } from './typeDefs'
import { resolvers } from './resolvers'

export const schema = createSchema<GraphQLContext>({
  typeDefs,
  resolvers,
})
