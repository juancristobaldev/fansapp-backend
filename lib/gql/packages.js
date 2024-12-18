const { gql } = require("apollo-server-express");

const types = gql`
  type Package {
    id: Int
    privacity: String
    visibility: String
    multimedia: [Multimedia]
    creator: Creator
    creatorId: Int
    sales: [Sales]
    albumsOfPlans: [PackageOfPlan]
    digitalProductId: Int!
    digitalProduct: DigitalProduct
    isVisible: Boolean
  }

  type PackageOfPlan {
    id: Int
    album: Package
    albumsId: Int
    plans: Plans
    plansId: Int
  }

  type PackageOutput {
    errors: String
    success: Boolean
    package: Package
  }

  type PackagesOutput {
    errors: String
    success: Boolean
    packages: [Package]
    count: Int
  }
`;

const inputs = gql`
  input GetPackagesInput {
    userId: Int
    creatorId: Int
    id: Int
    take: Int
    skip: Int
    previews: Boolean
  }

  input CreatePackageInput {
    userId: Int!
    multimedia: [IdInput]!
    privacity: String!
    amount: Float
    albumsOfPlans: [IdInput]
  }

  input UpdatePackageInput {
    packageId: Int!
    userId: Int!
    privacity: String
    multimedia: [IdInput]
    albumsOfPlans: [IdInput]
    amount: Float
    visibility: String
  }

  input DeletePackageInput {
    userId: Int!
    packageId: Int!
  }
`;

const mutations = gql`
  type Mutation {
    createPackage(input: CreatePackageInput!): PackageOutput
    updatePackage(input: UpdatePackageInput!): PackageOutput
    deletePackage(input: DeletePackageInput!): PackageOutput
  }
`;
const queries = gql`
  type Query {
    getNull: UserOutput
    getPackagesByCreator(input: GetPackagesInput!): PackagesOutput
    getPackagesDetails(input: GetPackagesInput!): [Package]
    getPackageById(input: GetPackagesInput!): Package
  }
`;

const defsPackages = gql`
  ${types}
  ${inputs}
  ${mutations}
  ${queries}
`;

module.exports = { defsPackages };
