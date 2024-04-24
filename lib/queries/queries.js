const posts = require("./posts");
const users = require("./users");
const suscriptions = require("./suscriptions");
const bookmarkers = require("./bookmarks");
const creators = require("./creators");

module.exports = {
  ...posts,
  ...users,
  ...suscriptions,
  ...bookmarkers,
  ...creators,
};
