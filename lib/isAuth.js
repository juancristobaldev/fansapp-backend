const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const isAuth = async (callback, error, context, id) => {
  const user = await prisma.users.findUnique({
    where: {
      id: id,
      AND: {
        token: context.authorization,
      },
    },
  });

  console.log(user);
  if (user) {
    return callback(user);
  } else {
    return error();
  }
};

module.exports = isAuth;
