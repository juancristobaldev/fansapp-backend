const mutations = require("./mutations/mutations");
const queries = require("./queries/queries");

const resolvers = {
  Query: queries,
  Mutation: mutations,
};
module.exports = resolvers;
