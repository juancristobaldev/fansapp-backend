const { PrismaClient } = require("@prisma/client");
const { getCacheData, updateCache } = require("./cache");
const prisma = new PrismaClient();

const isAuth = async (callback, error, context, id, required = true, rol) => {
  let user;
  if (required && id) {
    const dataCache = getCacheData(`user-${id}-${context.authorization}`);

    let where = {};

    if (rol) {
      where.rol = rol;
    }

    if (context.authorization === dataCache?.token) {
      user = dataCache;
    } else if (!dataCache && id) {
      user = await prisma.user.findFirst({
        include: {
          creator: {
            select: {
              id: true,
            },
          },
        },
        where: {
          id: id,
          ...where,
          AND: {
            token: context.authorization,
          },
        },
      });

      console.log(user);

      if (user) {
        updateCache(`user-${id}-${context.authorization}`, {
          ...user,
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
