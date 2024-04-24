const { gql } = require("apollo-server-express");
const { typesUser } = require("./user");
const { defsCreator } = require("./creators");
const { defsSettings } = require("./settings");
const { defsPosts } = require("./posts");
const { defsSuscriptions } = require("./suscriptions");
const { defsBookmarkers } = require("./bookmarkers");
const typeDefs = gql`
  scalar Date
  scalar Upload

  type Output {
    errors: String
    success: Boolean
  }

  ${typesUser}
  ${defsCreator}
  ${defsSettings}
  ${defsPosts}
  ${defsSuscriptions}
  ${defsBookmarkers}
`;

module.exports = typeDefs;
