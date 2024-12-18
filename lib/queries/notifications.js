const isAuth = require("../isAuth");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;

module.exports = {
  getNotificationsByIdUser: async (parent, args, context) => {
    if (!context || !args.input.userId) return [];
    console.log(args.input.userId);
    return await isAuth(
      async (user) => {
        try {
          console.log(user, args.input);
          const notifications = await prisma.notification.findMany({
            take: args.input.take != null ? args.input.take : 15,
            skip: args.input.skip || 0,
            where: {
              receiverId: user.id,
            },
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
