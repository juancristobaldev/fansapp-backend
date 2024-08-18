const { gql } = require("apollo-server-express");

const types = gql`
  type Creator {
    id: Int
    status: String
    category: String
    country: String
    city: String
    address: String
    zipCode: String
    dniFront: String
    dniBack: String
    approbedDate: Date
    requestDate: Date
    request: [RequestCreator]
    user: User
  }
  type RequestCreator {
    id: Int
    status: String
    country: String
    city: String
    address: String
    zipCode: String
    createdAt: Date
    dniFront: String
    dniBack: String
    creator: Creator
    creatorId: Int
  }
`;

const inputs = gql`
  input CreateCreatorInput {
    userId: Int!
    country: String!
    city: String!
    address: String!
    zipCode: String!
    dniFront: String
    dniBack: String
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

  input UpdateRequestInput {
    userId: Int!
    requestId: Int!
    status: String!
  }
`;

const outputs = gql`
  type CreatorOutput {
    creator: Creator
    errors: String
    success: Boolean
  }
`;

const queries = gql`
  type Query {
    getRequestOfCreator(input: PaginationInput!): [RequestCreator]
    getCreators(search: String!): [Creator]
    getRequestCreators(input: PaginationInput!): [Creator]
  }
`;

const mutations = gql`
  type Mutation {
    updateCreator(input: UpdateCreatorInput!): CreatorOutput
    updateRequest(input: UpdateRequestInput!): [RequestCreator]
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
