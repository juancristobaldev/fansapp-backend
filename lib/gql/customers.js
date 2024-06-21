const { gql } = require("apollo-server-express");

const types = gql`
  type Customer {
    id: Int!
    customerId: String!
    last4CardDigits: Int
    status: Int
    createdAt: Date
    registerDate: Date
    user: User!
    userId: Int!
    shopping: [Sales]
    wallet: Wallet
    walletId: Int!
  }

  type Movements {
    id: Int!
    amount: Float!
    type: String
    createdAt: Date
    receiver: Creator
    creatorId: Int
    wallet: Wallet
    walletId: Int
  }

  type Wallet {
    id: Int!
    amount: Float!
    movements: [Movements]
    customer: Customer
  }
`;

const inputs = gql`
  input CreateCustomerInput {
    userId: Int!
  }
`;

const mutations = gql`
  type Mutation {
    createCustomer(input: CreateCustomerInput!): UserOutput
    updateCustomer(input: CreateCustomerInput!): UserOutput
    deleteCustomer(userId: Int!): Output
  }
`;
const queries = gql`
  type Query {
    getWallets: [Wallet]
    getWalletById(userId: Int): Wallet
  }
`;

const defsCustomers = gql`
  ${types}
  ${inputs}
  ${mutations}
  ${queries}
`;

module.exports = { defsCustomers };
