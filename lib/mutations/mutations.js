const users = require("./users");
const posts = require("./posts");
const creators = require("./creators");
const settings = require("./settings");
const suscriptions = require("./suscriptions");
const plans = require("./plans");
const paidMessages = require("./paidMessages");
const sales = require("./sales");
const notifications = require("./notifications");
const messages = require("./messages");

module.exports = {
  ...users,
  ...posts,
  ...creators,
  ...settings,
  ...suscriptions,
  ...plans,
  ...paidMessages,
  ...sales,
  ...notifications,
  ...messages,
};
