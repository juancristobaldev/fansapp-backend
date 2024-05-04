const { gql } = require("apollo-server-express");

const types = gql`
  type Multimedia {
    id: Int!
    source: String!
    user: User!
    post: Post!
    type: String
  }

  type Post {
    id: Int!
    location: String
    multimedia: [Multimedia]
    amount: Float
    description: String
    privacity: String!
    createdAt: Date
    updateAt: Date
    likes: [Likes]
    comments: [Comments]
    users: User
    bookmarkers: [Bookmarkers]
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
`;

const inputs = gql`
  input GetPostsInput {
    userId: Int!
    myUserId: Int!
  }

  input CreatePostInput {
    location: String
    multimedia: [Upload]
    description: String
    privacity: String!
  }

  input LikePostInput {
    idUser: Int!
    idPost: Int!
    idCreator: Int!
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
    idPost: Int
    idUser: Int
    idParent: Int
  }
`;

const outputs = gql`
  type PostsOutput {
    errors: String
    success: Boolean
    posts: [Post]
  }

  type PostOutput {
    errors: String
    success: Boolean
    posts: Post
  }

  type LikesOutput {
    errors: String
    success: Boolean
    like: Boolean
    likes: [Likes]
  }

  type CommentOutput {
    errors: String
    success: Boolean
    comment: Comments
  }
`;

const queries = gql`
  type Query {
    getPosts: [Post]
    getPostsOfUser(input: GetPostsInput!): PostsOutput
    getPostById(id: Int!): Post
    getLikesByPost(postId: Int!): [Likes]
    getCommentsByPost(postId: Int!): [Comments]
  }
`;

const mutations = gql`
  type Mutation {
    createPost(input: CreatePostInput!): PostOutput
    updatePost(input: UpdatePostInput!): PostOutput
    deletePost(id: Int!): Output
    likePost(input: LikePostInput!): LikesOutput
    createComment(input: CreateCommentInput): CommentOutput
    deleteComment(id: Int!): Output
    likeComment(id: Int!): CommentOutput
  }
`;

const defsPosts = gql`
  ${types}
  ${inputs}
  ${queries}
  ${outputs}
  ${mutations}
`;

module.exports = { defsPosts };