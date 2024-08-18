const posts = require("./posts");
const users = require("./users");
const suscriptions = require("./suscriptions");
const bookmarkers = require("./bookmarks");
const creators = require("./creators");
const sales = require("./sales");
const algoritms = require("./algoritms");
const wallet = require("./wallet");
const notifications = require("./notifications");
const messages = require("./messages");
const packages = require("./packages");

module.exports = {
  ...posts,
  ...users,
  ...suscriptions,
  ...bookmarkers,
  ...creators,
  ...sales,
  ...algoritms,
  ...wallet,
  ...notifications,
  ...messages,
  ...packages,
};
