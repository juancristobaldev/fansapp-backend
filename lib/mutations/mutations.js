const users = require("./users");
const posts = require("./posts");
const creators = require("./creators");
const settings = require("./settings");

module.exports = {
  ...users,
  ...posts,
  ...creators,
  ...settings,
};
