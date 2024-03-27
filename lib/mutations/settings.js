const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();

module.exports = {
  updatePrivacity: async (parent, args, context) => {
    const input = { ...args.input };

    delete input.userId;

    console.log(input);
    const errors = {};

    const response = await isAuth(
      async (user) => {
        console.log(user);
        const privacity = await prisma.privacity
          .upsert({
            where: {
              userId: user.id,
            },
            update: { ...input },
            create: {
              userId: user.id,
              ...input,
            },
          })
          .catch((error) => {
            errors.error = error;
          });

        if (privacity) {
          console.log(privacity);
          return {
            errors: false,
            success: true,
            privacity: privacity,
          };
        }
      },
      (error) => {
        errors.errorAuth = error;
        return {
          errors: JSON.stringify(errors),
          success: false,
          privacity: false,
        };
      },
      context,
      args.input.userId
    );

    return response;
  },
  deleteSession: async (parent, args, context) => {
    return isAuth(
      (user) => {},
      (error) => ({
        errors: JSON.stringify({
          error,
        }),
        success: false,
      }),
      context,
      args.input.userId
    );
  },
  deleteAllSessions: async (parent, args, context) => {
    return isAuth(
      async (user) => {
        const errors = {};
        prisma.sessions
          .deleteMany({
            where: {
              userId: user.id,
            },
          })
          .catch((error) => (errors.error = error));

        if (JSON.stringify(errors) === JSON.stringify(errors))
          return {
            errors: false,
            success: true,
          };

        return {
          errors: JSON.stringify(errors),
          success: false,
        };
      },
      (error) => ({
        errors: JSON.stringify({
          error,
        }),
        success: false,
      }),
      context,
      args.input.userId
    );
  },
  updateNotifications: async (parent, args, context) => {},
  updateTheme: async (parent, args, context) => {},
};
