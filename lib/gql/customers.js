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

const defsCustomers = gql`
  ${types}
  ${inputs}
  ${mutations}
`;

module.exports = { defsCustomers };
