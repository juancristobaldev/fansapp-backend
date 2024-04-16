const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const isAuth = async (callback, error, context, id, include = {}) => {
  const user = await prisma.users.findUnique({
    where: {
      id: id,
      AND: {
        token: context.authorization,
      },
    },
    include: include,
  });

  if (user) {
    return callback(user);
  } else {
    return error();
  }
};

module.exports = isAuth;
