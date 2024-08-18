const { gql } = require("apollo-server-express");

const types = gql`
  type Post {
    id: Int!
    location: String
    multimedia: [Multimedia]
    description: String
    privacity: String!
    createdAt: Date
    updateAt: Date
    likes: [Likes]
    comments: [Comments]
    creator: Creator
    bookmarkers: [Bookmarkers]
    usersId: Int
    digitalProductId: Int
    nLikes: Int
    nComments: Int
    isVisible: Boolean
  }

  type Likes {
    id: Int!
    users: User
    media: Post
    usersId: Int
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

  type PostOfPlan {
    id: Int
    plans: Plans
    posts: Post
    plansId: Int
    postsId: Int
  }
`;

const inputs = gql`
  input GetPostsInput {
    userId: Int
    myUserId: Int
    skip: Int
    first: Int
  }

  input GetPostsByIdInput {
    id: Int!
    userId: Int
    skip: Int
  }

  input CreatePostInput {
    location: String
    description: String
    amount: Float
    privacity: String!
    userId: Int!
    multimedias: [MultimediaInput]
    plans: [IdInput]
  }

  input DeletePostInput {
    userId: Int!
    postId: Int!
  }

  input LikePostInput {
    idUser: Int!
    idPost: Int!
    idCreator: Int!
  }

  input UpdatePostInput {
    id: Int!
    userId: Int!
    location: String
    multimedia: [MultimediaInput]
    amount: Float
    description: String
    privacity: String
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
    post: Post
  }

  type LikesOutput {
    errors: String
    success: Boolean
    like: Boolean
    post: Post
  }

  type CommentOutput {
    errors: String
    success: Boolean
    comment: Comments
    post: Post
  }
`;

const queries = gql`
  type Query {
    getPosts: [Post]
    getPreviewsPosts: [Post]
    getPostsOfUser(input: GetPostsInput!): PostsOutput
    getPostById(input: GetPostsByIdInput!): Post
    getLikesByPost(postId: Int!): [Likes]
    getCommentsByIdPost(input: GetPostsByIdInput!): [Comments]
  }
`;

const mutations = gql`
  type Mutation {
    createPost(input: CreatePostInput!): UserOutput
    updatePost(input: UpdatePostInput!): UserOutput
    deletePost(input: DeletePostInput!): UserOutput
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
