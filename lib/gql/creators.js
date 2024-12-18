const { gql } = require("apollo-server-express");

const types = gql`
  type Creator {
    id: Int
    user: User
    category: String
    request: [RequestCreator]
    suscriptors: [Suscriptions]
    saveds: [Bookmarkers]
    plans: [Plans]
    digitalProducts: [DigitalProduct]
    paidMessages: PaidMessages
    approbedDate: Date
    requestDate: Date
    nLikes: Int
    nComments: Int
    nImages: Int
    nVideos: Int
    nPosts: Int
    posts: [Post]
  }

  type Hashtag {
    id: Int
    hashtag: String
    profiles: [HashTagProfile]
    posts: [HashTagPosts]
  }

  type HashTagProfile {
    id: Int
    hashtag: Hashtag
    hashtagId: Int
    profile: Profile
    profileId: Int
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

  type DigitalProduct {
    id: Int
    creator: Creator
    creatorId: Int
    discount: Int
    amount: Float
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

  input AproveCreatorInput {
    userId: Int!
    creatorId: Int!
  }

  input GetCreatorInput {
    myId: Int!
    userId: Int!
  }

  input AddHashtagInput {
    hashtag: String!
    userId: Int!
  }

  input DeleteHashtagInput {
    idHashtag: Int!
    userId: Int!
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
    getCreator(input: GetCreatorInput!): Creator
    getCreators(search: String!): [Creator]
    getRequestCreators(userId: Int!): [Creator]
    getPlansCreators(input: GetCreatorInput!): [Plans]
    getHashtagsPopulars: [Hashtag]
  }
`;

const mutations = gql`
  type Mutation {
    addHashTag(input: AddHashtagInput!): UserOutput
    deleteHashTag(input: DeleteHashtagInput!): UserOutput
    createCreator(input: CreateCreatorInput!): UserOutput
    updateCreator(input: UpdateCreatorInput!): CreatorOutput
    aproveCreator(input: AproveCreatorInput!): CreatorOutput
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
