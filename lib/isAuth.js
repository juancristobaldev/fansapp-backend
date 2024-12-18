const { getCacheData, updateCache } = require("./cache");
const { usePrisma, executePrisma } = require("./prisma");
const prisma = usePrisma;

const isAuth = async (callback, error, context, id, required = true, rol) => {
  let user;

  if (required && id) {
    const dataCache = getCacheData(`user-${id}-${context.authorization}`);
    let rolOR = {};

    if (rol)
      rolOR = {
        OR: [{ rol: rol }, { rol: "admin" }],
      };

    if (context.authorization === dataCache?.token) user = dataCache;
    else if (!dataCache && id) {
      user = await executePrisma(
        async () =>
          await prisma.user.findFirst({
            include: {
              profile: {
                select: {
                  id: true,
                },
              },
              creator: {
                select: {
                  id: true,
                },
              },
            },
            where: {
              id: id,
              AND: [{ token: context.authorization }, rolOR],
            },
          })
      );

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
