const posts = require("./posts");
const users = require("./users");
const suscriptions = require("./suscriptions");
const bookmarkers = require("./bookmarks");

module.exports = {
  ...posts,
  ...users,
  ...suscriptions,
  ...bookmarkers,
};
