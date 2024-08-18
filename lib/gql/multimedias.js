const { gql } = require("apollo-server-express");

const types = gql`
  type Multimedia {
    id: Int!
    source: String!
    blur: String
    user: User!
    post: Post!
    type: String
    thumbnail: String
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
