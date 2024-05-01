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
    plans: [Plans]
    digitalProducts: [DigitalProduct]
    paidMessages: PaidMessages
  }

  type DigitalProduct {
    id: Int
    creator: Creator
    creatorId: Int
    plan: Plans
    post: Post
    paidMessages: PaidMessages
    sales: [Sales]
  }

  type PaidMessages {
    id: Int
    messages: Int
    amount: Float
    digitalProduct: DigitalProduct
    digitalProductId: Int
  }

  type Bags {
    id: Int
    creator: Creator
    messages: Int
    user: User
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
    aproveCreator(creatorId: Int): CreatorOutput
    updateDetailsCreator(input: UpdateDetailsCreatorInput!): DetailsOutput
    deleteCreator(creatorId: Int!): Output
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
