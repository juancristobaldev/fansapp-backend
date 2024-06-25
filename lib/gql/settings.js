const { gql } = require("apollo-server-express");

const types = gql`
  type Blocked {
    id: Int!
    userId: Int!
    users: User!
    blockedBy: Int!
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

  type Privacity {
    id: Int!
    profile: String!
    messages: String!
    users: User
  }

  type Theme {
    id: Int!
    user: User!
    darkMode: Boolean!
    themeColor: String!
    languageApp: String!
  }
`;

const inputs = gql`
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

  input DeleteSessionInput {
    sessionId: Int!
    userId: Int!
  }

  input DeleteAllSessionsInput {
    userId: Int!
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

  input UpdateThemeInput {
    userId: Int!
    darkMode: Boolean
    languageApp: String
    themeColor: String
  }
`;

const outputs = gql`
  type UpdatePasswordOutput {
    errors: String
    success: Boolean
    user: User
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
`;

const queries = gql`
  type Query {
    getBlockeds(userId: Int!): [Blocked]
    getSessions(userId: Int!): [Session]
  }
`;

const mutations = gql`
  type Mutation {
    updateProfile(input: UpdateProfileInput!): UserOutput
    updateUserContactInfo(input: UpdateContactInfoInput!): UserOutput
    updatePasswordUser(input: UpdatePasswordUserInput!): UpdatePasswordOutput
    blockUser(input: BlockedInput!): BlockUserOutput
    deleteBlocked(input: DeleteBlockedInput!): Output
    updatePrivacity(input: UpdatePrivacityInput!): UpdatePrivacityOutput
    updateTheme(input: UpdateThemeInput): ThemeOutput

    deleteSession(input: DeleteSessionInput!): Output
    deleteAllSessions(input: DeleteAllSessionsInput): Output
  }
`;

const defsSettings = gql`
  ${types}
  ${inputs}
  ${queries}
  ${outputs}
  ${mutations}
`;

module.exports = { defsSettings };
