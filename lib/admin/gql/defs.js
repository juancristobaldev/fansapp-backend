const { gql } = require("apollo-server-express");
const { userDefs } = require("./users");
const { defsCreator } = require("./creators");

const defs = gql`
  scalar Date
  scalar Byte

  ${userDefs}
  ${defsCreator}
`;

module.exports = defs;
