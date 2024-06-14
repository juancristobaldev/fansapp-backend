const NodeCache = require("node-cache");
const myCache = new NodeCache();

module.exports = {
  updateCache: (field, value, ttl = 86400) => {
    myCache.set(field, value, ttl);
  },
  getCacheData: (field) => {
    const data = myCache.get(field);
    console.log("DATA CACHE ->", data);
    return data;
  },
};
