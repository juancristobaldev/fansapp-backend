const { gql } = require("apollo-server-express");

const types = gql`
  type Sales {
    id: Int!
    status: Int!
    type: String!
    subject: String!
    amount: Float!
    createdAt: Date!
    paymentMethod: String!
    paymentDate: Date!
    transferDate: Date!
    digitalProduct: DigitalProduct
    digitalProductId: Int
  }
`;

const inputs = gql`
  input CreateSaleInput {
    id: String
    userId: Int!
    subject: String
    amount: Float
    customerId: Int
    digitalProductId: Int
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
