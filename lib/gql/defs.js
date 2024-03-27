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
  }

  type Creator {
    id: Int!
    status: String
    country: String
    city: String
    address: String
    zipCode: String
    dniFront: String
    dniBack: String
  }

  type Bookmarkers {
    id: Int
    post: Post
    users: User
  }

  type Profile {
    id: Int!
    photo: String
    description: String
    location: String
    language: String
    linkProfile: String
    frontPage: String
    tiktok: String
    instagram: String
    users: User!
    likes: [Likes]
    comments: [Comments]
  }

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
    description: String
    onlySuscriptors: Boolean
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

  type Privacity {
    id: Int!
    profile: String!
    messages: String!
    users: User
  }

  type Blocked {
    id: Int!
    userId: Int!
    users: User!
    blockedBy: Int!
  }

  type Notifications {
    id: Int!
    messages: Boolean!
    paidMessages: Boolean!
    likes: Boolean!
    comments: Boolean!
    donations: Boolean!
    suscriptors: Boolean!
    user: User
  }

  type Theme {
    id: Int!
    user: User!
    darkMode: Boolean!
    themeColor: String!
    languageApp: String!
  }

  type Suscriptions {
    id: Int!
    user: User!
    creator: Creator!
    createdAt: Date!
    deadDate: Date!
    price: Int!
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

  type Query {
    getUser(id: Int): UserOutput
    getUserById(input: UserQuery!): UserOutput
    getAuth(input: UserQuery!): LoggedinStatus
    getUsers(search: String!): [User]
    getPosts: [Post]
    getPostsOfUser(id: Int!): PostsOutput
    getPostById(id: Int!): Post
    getLikesByPost(postId: Int!): [Likes]
    getCommentsByPost(postId: Int!): [Comments]
    getBlockeds(userId: Int!): [Blocked]
    getSessions(userId: Int!): [Session]
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

  input UpdateContactInfoInput {
    userId: Int!
    email: String!
    password: String!
  }

  input UpdatePasswordUserInput {
    userId: Int!
    oldPassword: String!
    newPassword: String!
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

  input UpdateProfileInput {
    id: Int!
    description: String
    frontPage: String
    photo: String
    tiktok: String
    instagram: String
    linkProfile: String
    location: String
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

  type PostOutput {
    errors: String
    success: Boolean
    post: Post
  }

  type CommentOutput {
    errors: String
    success: Boolean
    comment: Comments
  }
  type ProfileOutput {
    errors: String
    success: Boolean
    profile: Profile
  }

  input LikePostInput {
    idUser: Int!
    idPost: Int!
  }

  input SavePostInput {
    idUser: Int!
    idPost: Int!
  }

  input CreateCreatorInput {
    userId: Int!
    country: String!
    city: String!
    address: String!
    zipCode: String!
    dniFront: String!
    dniBack: String!
  }

  input UpdatePrivacityInput {
    userId: Int!
    profile: String
    messages: String
  }

  input BlockedInput {
    userId: Int!
    blockedUserId: Int!
  }

  input DeleteBlockedInput {
    userId: Int!
    blockedUserId: Int!
  }

  input UpdateNotificationsInput {
    userId: Int!
    suscriptors: Boolean
    donations: Boolean
    comments: Boolean
    likes: Boolean
    paidMessages: Boolean
    messages: Boolean
  }

  input UpdateThemeInput {
    userId: Int!
    darkMode: Boolean
    languageApp: String
    themeColor: String
  }

  type SaveOutput {
    errors: String
    success: Boolean
    isSaved: Boolean
  }

  type UpdatePasswordOutput {
    errors: String
    success: Boolean
    user: User
  }

  type UpdatePrivacityOutput {
    privacity: Privacity
    errors: String
    success: Boolean
  }

  type BlockUserOutput {
    blocked: Blocked
    errors: String
    success: Boolean
  }

  type ThemeOutput {
    theme: Theme
    errors: String
    success: Boolean
  }

  type UpdateNotificationsOutput {
    notifications: Notifications
    success: Boolean
    errors: String
  }

  type Session {
    id: Int!
    deviceName: String!
    browser: String!
    source: String!
    lastSessionAt: Date!
    signInAt: Date!
    user: User!
  }

  input DeleteSessionInput {
    sessionId: Int!
    userId: Int!
  }

  input DeleteAllSessionsInput {
    userId: Int!
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
    likePost(input: LikePostInput!): LikesOutput
    createComment(input: CreateCommentInput): CommentOutput
    deleteComment(id: Int!): Output
    savePost(input: SavePostInput!): SaveOutput
    likeComment(id: Int!): CommentOutput
    updateProfile(input: UpdateProfileInput!): Output
    updateUserContactInfo(input: UpdateContactInfoInput!): UserOutput
    updatePasswordUser(input: UpdatePasswordUserInput!): UpdatePasswordOutput
    createCreator(input: CreateCreatorInput!): UserOutput
    updatePrivacity(input: UpdatePrivacityInput!): UpdatePrivacityOutput
    blockUser(input: BlockedInput!): BlockUserOutput
    deleteBlocked(input: DeleteBlockedInput!): Output
    updateTheme(input: UpdateThemeInput): ThemeOutput
    updateNotifications(
      input: UpdateNotificationsInput!
    ): UpdateNotificationsOutput
    deleteSession(input: DeleteSessionInput!): Output
    deleteAllSessions(input: DeleteAllSessionsInput): Output
  }
`;

module.exports = typeDefs;
