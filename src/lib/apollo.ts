import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: '/api/graphql-proxy'
  }),
  cache: new InMemoryCache()
});
