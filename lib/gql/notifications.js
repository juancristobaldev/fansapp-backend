const { gql } = require("apollo-server-express");

const types = gql`
  type Notification {
    id: Int
    content: String
    likes: Likes
    comments: Comments
    seen: Boolean
    createdAt: Date
    user: User
    usersId: Int
    likesId: Int
    commentsId: Int
    receiverId: Int
  }

  type Notifications {
    id: Int!
    messages: Boolean!
    paidMessages: Boolean!
    likes: Boolean!
    comments: Boolean!
    donations: Boolean!
    suscriptors: Boolean!
    purchases: Boolean
    user: User
  }
`;

const inputs = gql`
  input GetNotificationsInput {
    userId: Int!
    skip: Int
    take: Int
  }

  input NotificationsSeen {
    id: Int
  }

  input UpdateNotificationSeen {
    ids: [NotificationsSeen]
    userId: Int
  }

  input UpdateNotificationsInput {
    userId: Int!
    suscriptors: Boolean
    donations: Boolean
    comments: Boolean
    likes: Boolean
    paidMessages: Boolean
    messages: Boolean
    purchases: Boolean
  }
`;

const outputs = gql`
  type UpdateNotificationsOutput {
    notifications: Notifications
    success: Boolean
    errors: String
  }
`;

const queries = gql`
  type Query {
    getNotificationsByIdUser(input: GetNotificationsInput!): [Notification]
  }
`;

const mutations = gql`
  type Mutation {
    updateNotifications(input: UpdateNotificationsInput!): UserOutput
    seeNotifications(input: UpdateNotificationSeen): Output
  }
`;

const defsNotifications = gql`
  ${types}
  ${inputs}
  ${queries}
  ${mutations}
  ${outputs}
`;

module.exports = { defsNotifications };
