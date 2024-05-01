const { gql } = require("apollo-server-express");

const types = gql`
  type Plans {
    id: Int
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
    id: Int!
    creatorId: Int!
    userId: Int!
    amount: Float
    discount: Int
    visibility: Boolean
    yearlyVisibility: Boolean
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
    updatePlan(input: UpdatePlanInput): PlansOutput
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
