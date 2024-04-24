const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

// Generar un nuevo token UUID

module.exports = {
  getCreators: async (parent, args, context) => {
    const where = {
      status: "creator",
      user: {
        OR: [
          {
            firstName: {
              mode: "insensitive",
              contains: args.search.toLowerCase(),
            },
          },
          {
            lastName: {
              mode: "insensitive",
              contains: args.search.toLowerCase(),
            },
          },
          {
            username: {
              mode: "insensitive",
              contains: args.search.toLowerCase(),
            },
          },
        ],
      },
    };

    if (!args.search) delete where.user;

    const creators = await prisma.creator.findMany({
      where: where,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return creators;
  },
};
