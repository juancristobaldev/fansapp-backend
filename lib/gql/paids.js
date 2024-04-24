const { gql } = require("apollo-server-express");

const types = gql`
  type Paids {
    id: Int
    flowOrder: Int!
    paymentMethod: String!
    paymentDate: Date!
    transferDate: Date!
    amount: Int
    subject: String
    type: String
    productId: Int
    creatorId: Int
    userId: Int
  }
`;

const inputs = gql``;

const outputs = gql``;

const queries = gql`
  type Query {
   
  }
`;

const mutations = gql`
  type Mutation {

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
