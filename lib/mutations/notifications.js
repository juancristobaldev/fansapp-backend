const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

module.exports = {
  seeNotifications: async (parent, args, context) => {
    if (!args.input.userId || !args.input.ids.length) return [];

    const response = await isAuth(
      async () => {
        const ids = args.input.ids.map((id) => id.id);
        console.log("IDS", ids);
        try {
          const data = await prisma.notification.updateMany({
            where: {
              id: {
                in: ids,
              },
            },
            data: {
              seen: true,
            },
          });

          console.log("data", data);
          if (data.count == 0)
            return {
              errors: "Oops un error",
              success: false,
            };

          return {
            errors: false,
            success: true,
          };
        } catch (error) {
          console.log(error);
        }
      },
      (error) => {
        console.log(error);
      },
      context,
      args.input.userId
    );

    return response;
  },
  updateNotifications: async (parents, args, context) => {
    return await isAuth(
      async (user) => {
        console.log(args.input);
        let newValues = { ...args.input };
        delete newValues.userId;

        const newSettings = await prisma.notifications.update({
          where: {
            usersId: args.input.userId,
          },
          data: {
            ...newValues,
          },
        });

        console.log(newSettings);

        return {
          success: true,
          errors: false,
          user: {
            id: user.id,
            notifications: {
              ...newSettings,
            },
          },
        };
      },
      (error) => {
        console.log(error);
      },
      context,
      args.input.userId
    );
  },
};
