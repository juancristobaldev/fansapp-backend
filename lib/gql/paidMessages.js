const { gql } = require("apollo-server-express");

const types = gql`
  type PaidMessages {
    id: Int
    amount: Float
    digitalProduct: DigitalProduct
    digitalProductId: Int
    visibility: Boolean
  }

  type Bags {
    id: Int
    creator: Creator
    messages: Int
    user: User
  }
`;

const inputs = gql`
  input UpdatePaidMessages {
    id: Int!
    amount: Float
    creatorId: Int!
    userId: Int!
    visibility: Boolean
  }
`;

const mutations = gql`
  type Mutation {
    updatePaidMessages(input: UpdatePaidMessages!): UserOutput
  }
`;

const defsPaidMessages = gql`
  ${types}
  ${inputs}
  ${mutations}
`;

module.exports = { defsPaidMessages };
