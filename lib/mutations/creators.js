const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();

module.exports = {
  createCreator: async (parent, args, context) => {
    const { country, city, address, zipCode, userId } = args.input;

    const creators = await prisma.creator.findMany();

    console.log(creators);

    const response = await isAuth(
      async () => {
        const creator = await prisma.creator.create({
          data: args.input,
          include: {
            users: {
              include: {
                creator: true,
              },
            },
          },
        });
        if (creator) {
          console.log(creator);
          return {
            success: true,
            errors: false,
          };
        }
      },
      (error) => ({
        errors: `${error}`,
        success: false,
      }),
      context,
      userId
    );

    return response;
  },
};
