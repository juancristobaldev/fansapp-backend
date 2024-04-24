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
    price: Int!
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
    deadDate: Date
    price: Int!
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
    getSuscriptionsOfUser(userId: Int!): SuscriptionsOutput
  }
`;

const mutations = gql`
  type Mutation {
    createSuscription(input: CreateSuscriptionInput!): SuscriptionOutput
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
