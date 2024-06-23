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
  }
`;

const inputs = gql`
  input GetNotificationsInput {
    userId: Int!
    skip: Int
    take: Int
  }
`;

const queries = gql`
  type Query {
    getNotificationsByIdUser(input: GetNotificationsInput!): [Notification]
  }
`;

const defsNotifications = gql`
  ${types}
  ${inputs}
  ${queries}
`;

module.exports = { defsNotifications };
