const NodeCache = require("node-cache");
const myCache = new NodeCache();

module.exports = {
  updateCache: (field, value) => {
    myCache.set(field, value);
  },
  getCacheData: (field) => myCache.get(field),
};
