const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Generar un nuevo token UUID

module.exports = {
  createPost: async (parent, args, context) => {
    if (context.authorization) {
      const user = await prisma.users.findUnique({
        where: {
          token: context.authorization,
        },
      });

      if (user) {
        const id = user.id;

        const post = await prisma.posts
          .create({
            data: {
              ...args.input,
              usersId: id,
            },
          })
          .catch((error) => console.error(error));

        if (post) {
          return {
            errors: false,
            success: true,
            post: post,
          };
        } else {
          return {
            errors: "Error to create post",
            success: false,
            post: false,
          };
        }
      } else {
        return {
          errors: "No User Found",
          success: false,
          post: false,
        };
      }
    } else
      return {
        errors: "No Token Authorization",
        success: false,
        post: false,
      };
  },
};
