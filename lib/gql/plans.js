const { gql } = require("apollo-server-express");

const types = gql`
  type Plans {
    id: Int
    title: String
    updateAt: Date
    creator: Creator
    creatorId: Int
    createdAt: Date
    amount: Float
    yearlyAmount: Float
    monthlyAmountWithDiscount: Float
    yearlyAmountWithDiscount: Float
    visibility: Boolean
    yearlyVisibility: Boolean
    discount: Int
    type: String
    suscriptors: [Suscriptions]
    digitalProduct: DigitalProduct
    digitalProductId: Int
  }
`;

const inputs = gql`
  input UpdatePlanInput {
    userId: Int!
    planId: Int!
    title: Int
    permissions: String
    amount: String
    visibility: Boolean
    posts: [IdInput]
    packages: [IdInput]
  }

  input CreatePlanInput {
    userId: Int!
    title: Int!
    permissions: String!
    amount: String!
    visibility: Boolean!
    posts: [IdInput]
    packages: [IdInput]
  }

  input DeletePlanInput {
    id: Int!
    userId: Int!
  }
`;

const outputs = gql`
  type PlansOutput {
    errors: String
    success: Boolean
    plan: Plans
  }
`;

const queries = gql`
  type Query {
    getPlans: [Plans]
    getPlansByCreator(idCreator: Int): [Plans]
    getPlanById(idPlan: Int!): Plans
  }
`;

const mutations = gql`
  type Mutation {
    createPlan(input: CreatePlanInput!): Plans
    updatePlan(input: UpdatePlanInput!): PlansOutput
    deletePlan(input: DeletePlanInput!): UserOutput
  }
`;

const defPlans = gql`
  ${types}
  ${inputs}
  ${outputs}
  ${mutations}
  ${queries}
`;

module.exports = { defPlans };
