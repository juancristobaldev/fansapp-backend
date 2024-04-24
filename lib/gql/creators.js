const { gql } = require("apollo-server-express");

const types = gql`
  type Creator {
    id: Int
    status: String
    country: String
    city: String
    address: String
    zipCode: String
    dniFront: String
    dniBack: String
    user: User
    details: Details
    lengthJSON: String
    suscriptors: [Suscriptions]
    saveds: [Bookmarkers]
  }

  type Details {
    id: Int!
    suscription: Int!
    paidMessage: Int!
    title: String
    description: String
    creatorId: Int!
    creator: Creator!
  }
`;

const inputs = gql`
  input CreateCreatorInput {
    userId: Int!
    country: String!
    city: String!
    address: String!
    zipCode: String!
    dniFront: String!
    dniBack: String!
  }

  input UpdateDetailsCreatorInput {
    userId: Int
    creatorId: Int!
    suscription: Float
    paidMessage: Float
    messageFree: Boolean!
    suscriptionFree: Boolean!
    title: String
    description: String
  }

  input UpdateCreatorInput {
    id: Int!
    status: String
    country: String
    city: String
    address: String
    zipCode: String
    dniFront: String
    dniBack: String
  }
`;

const outputs = gql`
  type CreatorOutput {
    creator: Creator
    errors: String
    success: Boolean
  }

  type DetailsOutput {
    errors: String
    success: Boolean
    details: Details
  }
`;

const queries = gql`
  type Query {
    getCreators(search: String!): [Creator]
  }
`;

const mutations = gql`
  type Mutation {
    createCreator(input: CreateCreatorInput!): UserOutput
    updateCreator(input: UpdateCreatorInput!): CreatorOutput
    updateDetailsCreator(input: UpdateDetailsCreatorInput!): DetailsOutput
  }
`;

const defsCreator = gql`
  ${types}
  ${inputs}
  ${queries}
  ${outputs}
  ${mutations}
`;

module.exports = { defsCreator };
