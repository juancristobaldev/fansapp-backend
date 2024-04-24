const { gql } = require("apollo-server-express");

const types = gql`
  type Bookmarkers {
    id: Int
    post: Post
    postsId: Int
    users: User
    usersId: Int
    creator: Creator
    creatorId: Int
    createdAt: Date
  }
`;

const inputs = gql`
  input GetBookmarkersInput {
    type: String!
    userId: Int!
  }
  input SavePostInput {
    idUser: Int!
    idPost: Int!
  }
  input SaveCreatorInput {
    userId: Int!
    creatorId: Int!
  }
`;

const outputs = gql`
  type BookmarkerOutput {
    errors: String
    success: Boolean
    bookmarkers: [Bookmarkers]
  }

  type SaveOutput {
    errors: String
    success: Boolean
    isSaved: Boolean
  }
`;

const queries = gql`
  type Query {
    getBookmarksByType(input: GetBookmarkersInput!): BookmarkerOutput
  }
`;

const mutations = gql`
  type Mutation {
    savePost(input: SavePostInput!): SaveOutput
    saveCreator(input: SaveCreatorInput!): SaveOutput
  }
`;

const defsBookmarkers = gql`
  ${types}
  ${inputs}
  ${queries}
  ${outputs}
  ${mutations}
`;

module.exports = { defsBookmarkers };
