const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Date
  scalar Upload

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
    profile: Profile
    posts: [Post]
    comments: [Comments]
    likes: [Likes]
    multimedia: [Multimedia]
  }

  type Profile {
    id: Int!
    photo: String
    description: String
    frontPage: String
    users: User!
    likes: [Likes]
    comments: [Comments]
  }

  type Multimedia {
    id: Int!
    source: String!
    user: User!
    post: Post!
  }

  type Post {
    id: Int!
    location: String
    multimedia: [Multimedia]
    description: String
    onlySuscriptors: Boolean
    createdAt: Date
    updateAt: Date
    likes: [Likes]
    comments: [Comments]
  }

  type Likes {
    id: Int!
    users: User
    post: Post
  }

  type Comments {
    id: Int!
    content: String!
    createdAt: Date!
    updateAt: Date
    parent: Comments
    subcomments: [Comments]
    users: User
    posts: Post
  }

  input UserQuery {
    id: Int
    medias: Boolean
    comments: Boolean
    likes: Boolean
    token: String
  }

  type LoggedinStatus {
    isLoggedin: Boolean
    user: User
  }

  type Query {
    getUser: UserOutput
    getUserById(input: UserQuery!): UserOutput
    getAuth(input: UserQuery!): LoggedinStatus
    getUsers: [User]
    getPosts: [Post]
    getPostById(id: Int!): Post
    getLikesByPost(postId: Int!): [Likes]
    getCommentsByPost(postId: Int!): [Comments]
  }

  type Output {
    errors: String
    success: Boolean
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

  type UserOutput {
    user: User
    success: Boolean
    errors: String
  }

  input UpdateUserInput {
    id: Int!
    firstName: String
    lastName: String
    country: String
    email: String
    password: String
    gender: String
    birthday: String
    username: String
  }

  input UserSignInInput {
    userEmail: String!
    password: String!
  }

  input UserSignInInputRRSS {
    userEmail: String!
    password: String!
  }

  input DeleteInput {
    id: Int!
  }

  input CreatePostInput {
    location: String
    multimedia: [Upload]
    description: String
    onlySuscriptors: Boolean
  }

  input UpdatePostInput {
    location: String
    description: String
    onlySuscriptors: Boolean
  }

  input DeletePostInput {
    id: Int!
  }

  input CreateCommentInput {
    content: String
    postId: Int
    parentId: Int
  }

  type PostOutput {
    errors: String
    success: Boolean
    post: Post
  }

  type CommentOutput {
    errors: String
    success: Boolean
    Comments: Comments
  }

  type Mutation {
    createUser(input: CreateUserInput!): UserOutput
    updateUser(input: UpdateUserInput!): UserOutput
    deleteUser(id: Int!): Output
    userSignIn(input: UserSignInInput): UserOutput
    userSignInRRSS(input: UserSignInInputRRSS): UserOutput
    createPost(input: CreatePostInput!): PostOutput
    updatePost(input: UpdatePostInput!): PostOutput
    deletePost(id: Int!): Output
    createComment(input: CreateCommentInput): CommentOutput
    deleteComment(id: Int!): Output
    likePost(id: Int!): PostOutput
    savePost(id: Int!): PostOutput
    likeComment(id: Int!): CommentOutput
  }
`;

module.exports = typeDefs;
