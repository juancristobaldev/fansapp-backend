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
    posts: [Post]
    comments: [Comments]
    likes: [Likes]
    multimedia: [Multimedia]
    bookmarkers: [Bookmarkers]
    creator: Creator
    privacity: Privacity
    suscriptions: [Suscriptions]
    bags: [Bags]
    customer: Customer
    estadistics: Estadistics
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
    likes: [Likes]
    comments: [Comments]
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
    session: Session
  }
`;

const inputs = gql`
  input PaginationInput {
    take: Int
    skip: Int
    get: Boolean
  }

  input GetUserInput {
    userId: Int
    username: String!
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

  input UserQuery {
    id: Int
    medias: Boolean
    comments: Boolean
    likes: Boolean
    token: String
    update: Boolean
  }

  input UserSignInInput {
    userEmail: String!
    password: String!
  }

  input UserSignInInputRRSS {
    userEmail: String!
    password: String!
  }

  input DeleteAccountInput {
    userId: Int!
    confirmText: String!
  }

  input SearchUser {
    username: String!
    skip: Int
  }
`;

const mutations = gql`
  type Mutation {
    createUser(input: CreateUserInput!): UserOutput
    updateUser(input: UpdateUserInput!): UserOutput
    deleteUser(id: Int!): Output
    userSignIn(input: UserSignInInput): SignInOutput
    userLogOut(userId: Int!): Output
    userSignInRRSS(input: UserSignInInputRRSS): UserOutput
    deleteAccount(input: DeleteAccountInput!): UserOutput
  }
`;

const queries = gql`
  type Query {
    getUser(input: GetUserInput!): UserOutput
    getUserById(input: UserQuery!): UserOutput
    searchUser(input: SearchUser!): OutputProfile
    getAuth(input: UserQuery!): LoggedinStatus
    getUsers(search: String!): [User]
    getMyHub(input: PaginationInput!): [Post]
    getPopularsCreators(input: PaginationInput!): [Profile]
    getNewsCreators(input: PaginationInput!): [Profile]
  }
`;

const typesUser = gql`
  ${types}
  ${inputs}
  ${outputs}
  ${mutations}
  ${queries}
`;

module.exports = { typesUser };
