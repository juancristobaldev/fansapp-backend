const { gql } = require("apollo-server-express");

const types = gql`
  type Conversation {
    id: Int
    members: [MemberConversation]
    messages: [Message]

    photo: String
    title: String
    subtitle: String
    notseen: Int
  }

  type NotSeenConversation {
    id: Int
    count: Int
  }

  type MemberConversation {
    id: Int
    user: User!
    usersId: Int!
    conversation: Conversation
    conversationId: Int
    joinAt: Date!
  }

  type Message {
    id: Int!
    content: String!
    createdAt: Date!
    transmitter: [User]!
    transmitterId: Int!
    paidMessages: [PaidMessages]
    paidMessagesId: Int
    conversation: Conversation
    conversationId: Int
    multimedia: [Multimedia]
    seen: Boolean
  }

  type ListUsers {
    plans: [Plans]
    suscriptors: [Suscriptions]
    exSuscriptors: [Suscriptions]
  }
`;

const inputs = gql`
  input GetChatInput {
    receiverId: Int
    transmitterId: Int
  }

  input CreateMessageInput {
    transmitterId: Int
    receiverId: Int
    content: String
    multimedia: [MultimediaInput]
  }

  input SeenMessageInput {
    id: Int!
    transmitterId: Int
  }
  input GetConversationInput {
    username: String
    transmitterId: Int!
    typeChat: String
    typeMessages: String
  }
`;

const queries = gql`
  type Query {
    getConversations(input: GetConversationInput!): [Conversation]
    haveNotSeenConversations(transmitterId: Int): NotSeenConversation
    getConversation(input: GetChatInput!): Conversation
    getListUsers: [ListUsers]
  }
`;
const mutations = gql`
  type Mutation {
    sendMessage(input: CreateMessageInput!): Conversation
    seenMessage(input: SeenMessageInput!): NotSeenConversation
  }
`;
/*

const outputs = gql``;



const mutations = gql`
  type Mutation {
    sendMessage(input: CreateMessage!): [Message]
  }
`;

*/

const defMessages = gql`
  ${types}
  ${inputs}
  ${queries}
  ${mutations}
`;

module.exports = { defMessages };
