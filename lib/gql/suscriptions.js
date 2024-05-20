const { gql } = require("apollo-server-express");

const types = gql`
  type Suscriptions {
    id: Int!
    user: User!
    creator: Creator!
    userId: Int!
    creatorId: Int!
    createdAt: Date!
    deadDate: Date
    price: Int
    status: Int
  }

  type SuscriptionsOutput {
    success: Boolean!
    errors: String
    suscriptions: [Suscriptions]
  }
`;

const inputs = gql`
  input CreateSuscriptionInput {
    userId: Int!
    creatorId: Int!
    planId: Int!
  }

  input UpdateSuscriptionInput {
    id: Int!
    userId: Int!
    creatorId: Int
    createdAt: Date
    deadDate: Date
    price: Int
    status: Int
  }

  input CancelSuscriptionInput {
    userId: Int!
    id: Int!
    creatorId: Int!
  }
`;

const outputs = gql`
  type SuscriptionOutput {
    errors: String
    success: Boolean
    suscription: Suscriptions
  }
`;

const queries = gql`
  type Query {
    getSuscriptions(status: Int): [Suscriptions]
    getSuscriptionsOfUser(userId: Int!): SuscriptionsOutput
  }
`;

const mutations = gql`
  type Mutation {
    createSuscription(input: CreateSuscriptionInput!): UserOutput
    updateSuscription(input: UpdateSuscriptionInput!): UserOutput
    cancelSuscription(input: CancelSuscriptionInput!): UserOutput
    deleteSuscription(suscriptionId: Int!): Output
  }
`;

const defsSuscriptions = gql`
  ${types}
  ${inputs}
  ${queries}
  ${outputs}
  ${mutations}
`;

module.exports = { defsSuscriptions };
