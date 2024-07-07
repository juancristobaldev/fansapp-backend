const { gql } = require("apollo-server-express");
const { typesUser } = require("./user");
const { defsCreator } = require("./creators");
const { defsSettings } = require("./settings");
const { defsPosts } = require("./posts");
const { defsSuscriptions } = require("./suscriptions");
const { defsBookmarkers } = require("./bookmarkers");
const { defSales } = require("./sales");
const { defPlans } = require("./plans");
const { defsPaidMessages } = require("./paidMessages");
const { defsCustomers } = require("./customers");
const { defMultimedias } = require("./multimedias");
const { defsNotifications } = require("./notifications");
const { defMessages } = require("./messages");

const typeDefs = gql`
  scalar Date
  scalar Upload
  scalar Byte

  input CompressInput {
    type: String!
    source: Byte!
  }

  type Output {
    errors: String
    success: Boolean
  }

  ${typesUser}
  ${defsCreator}
  ${defsSettings}
  ${defMultimedias}
  ${defsPosts}
  ${defSales}
  ${defsSuscriptions}
  ${defsBookmarkers}
  ${defPlans}
  ${defsPaidMessages}
  ${defsCustomers}
  ${defsNotifications}
  ${defMessages}
`;

module.exports = typeDefs;
