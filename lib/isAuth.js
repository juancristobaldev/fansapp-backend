const { PrismaClient } = require("@prisma/client");
const { getCacheData, updateCache } = require("./cache");
const prisma = new PrismaClient();

const isAuth = async (callback, error, context, id) => {
  const dataCache = getCacheData(id);
  console.log("DATA CACHE ->", dataCache, id);
  let user;
  if (context.authorization === dataCache?.token) {
    user = dataCache;
  } else {
    user = await prisma.users.findFirst({
      where: {
        id: id,
        AND: {
          token: context.authorization,
        },
      },
      select: {
        id: true,
        rol: true,
      },
    });

    if (user) {
      updateCache(id, {
        token: context.authorization,
        rol: user.rol,
      });
    }
  }

  if (user) {
    return callback(user);
  } else {
    return error();
  }
};

module.exports = isAuth;
