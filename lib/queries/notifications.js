const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();

module.exports = {
  getNotificationsByIdUser: async (parent, args, context) => {
    if (!context || !args.input.userId) return [];
    console.log(args.input.userId);
    return await isAuth(
      async (user) => {
        try {
          console.log(user, args.input);
          const notifications = await prisma.notification.findMany({
            skip: args.input.skip || 0,

            orderBy: {
              createdAt: "desc",
            },
            include: {
              user: {
                select: {
                  username: true,
                },
              },
              likes: {
                select: {
                  media: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
              comments: {
                select: {
                  id: true,
                  content: true,
                },
              },
            },
          });

          return notifications;
        } catch (error) {
          console.log(error);
        }
      },
      (error) => console.log(error),
      context,
      args.input.userId
    );
  },
};
