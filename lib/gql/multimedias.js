const { gql } = require("apollo-server-express");

const types = gql`
  type Multimedia {
    id: Int!
    source: String!
    user: User!
    post: Post!
    type: String
  }
`;

const inputs = gql`
  input MultimediaInput {
    id: Int!
    source: String
    type: String
  }
`;

const defMultimedias = gql`
  ${types}
  ${inputs}
`;

module.exports = { defMultimedias };
