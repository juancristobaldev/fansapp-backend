const users = require("./users");
const posts = require("./posts");
const creators = require("./creators");
const settings = require("./settings");
const suscriptions = require("./suscriptions");

module.exports = {
  ...users,
  ...posts,
  ...creators,
  ...settings,
  ...suscriptions,
};
