const { gql } = require("apollo-server-express");

/*
 const response = await isAuth(
      (user) => {
        console.log(user)
      },
      (error) => ({
        errors:JSON.stringify([error]),
        success:false
      }),
      context,
      args.input.userId
    )
*/

const types = gql`
  type User {
    id: Int
    token: String
    rol: String
    username: String
    firstName: String
    lastName: String
    gender: String
    birthday: Date
    email: String
    password: String
    createdAt: Date
    updateAt: Date
    updateFirstName: Boolean
    updateLastName: Boolean
    profile: Profile
    creator: Creator
  }

  type Estadistics {
    likes: Int
    multimedias: Int
    posts: Int
    images: Int
    videos: Int
  }

  type OutputProfile {
    profiles: [Profile]
    nProfiles: Int
  }

  type Profile {
    id: Int!
    photo: String
    photoHash: Byte
    description: String
    location: String
    language: String
    linkProfile: String
    frontPage: Byte
    tiktok: String
    instagram: String
    users: User!
    nLikes: Int
    nPosts: Int
    user: User
  }
`;

const outputs = gql`
  type UserOutput {
    user: User
    success: Boolean
    errors: String
  }

  type Output {
    errors: String
    success: Boolean
  }

  type LoggedinStatus {
    isLoggedin: Boolean
    user: User
  }

  type SignInOutput {
    errors: String
    success: Boolean
    user: User
  }
`;

const inputs = gql`
  input PaginationInput {
    userId: Int
    take: Int
    skip: Int
    get: Boolean
    itemId: Int
  }

  input GetUserInput {
    myId: Int
    userId: Int!
  }

  input UserSignInInput {
    email: String!
    password: String
  }

  input CreateUserInput {
    username: String!
    firstName: String!
    lastName: String
    country: String
    gender: String
    birthday: String
    email: String!
    password: String!
  }

  input UpdateUserInput {
    id: Int!
    username: String
    rol: String
    linkProfile: String
    firstName: String
    lastName: String
    birthday: String
    gender: String
    location: String
    language: String
    tiktok: String
    instagram: String
  }
`;

const mutations = gql`
  type Mutation {
    userSignIn(input: UserSignInInput): UserOutput
  }
`;

const queries = gql`
  type Query {
    getUser(input: GetUserInput!): UserOutput
    getAuth(userId: Int!): LoggedinStatus
    getUsers(input: PaginationInput): [User]
    getRequestCreators(input: PaginationInput): [Creator]
  }
`;

const userDefs = gql`
  ${types}
  ${inputs}
  ${outputs}
  ${mutations}
  ${queries}
`;

module.exports = { userDefs };
