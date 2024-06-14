const { PrismaClient } = require("@prisma/client");
const { getCacheData, updateCache } = require("./cache");
const prisma = new PrismaClient();

const isAuth = async (callback, error, context, id, required = true) => {
  let user;
  if (required && id) {
    const dataCache = getCacheData(`user-${id}-${context.authorization}`);

    if (context.authorization === dataCache?.token) {
      user = dataCache;
    } else if (!dataCache && id) {
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

      console.log(user);

      if (user) {
        updateCache(`user-${id}-${context.authorization}`, {
          token: context.authorization,
          rol: user.rol,
        });
      }
    }
  }

  if (user || !required) {
    return callback(user);
  } else {
    return error();
  }
};

module.exports = isAuth;
