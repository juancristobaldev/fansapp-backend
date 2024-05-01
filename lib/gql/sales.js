const { gql } = require("apollo-server-express");

const types = gql`
  type Sales {
    id: Int!
    flowOrder: Int!
    type: String!
    subject: String!
    amount: Float!
    createdAt: Date!
    paymentMethod: String!
    paymentDate: Date!
    transferDate: Date!
    user: User!
    userId: Int!
    creator: Creator!
    creatorId: Int!
    post: Post
    postId: Int
  }
`;

const inputs = gql`
  input CreateSaleInput {
    flowOrder: Int!
    type: String!
    subject: String!
    amount: Int!
    createdAt: Date!
    paymentMethod: String!
    paymentDate: Date!
    transferDate: Date!
  }
`;

const outputs = gql`
  type SalesOutput {
    errors: String
    success: Boolean
    sale: Sales
  }
`;

const queries = gql`
  type Query {
    getSalesByStatus(status: String): [Sales]
    getSalesByIdCreator(idCreator: Int): [Sales]
  }
`;

const mutations = gql`
  type Mutation {
    createSale(input: CreateSaleInput!): SalesOutput
  }
`;

const defSales = gql`
  ${types}
  ${inputs}
  ${queries}
  ${outputs}
  ${mutations}
`;

module.exports = { defSales };
