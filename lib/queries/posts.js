const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

// Generar un nuevo token UUID

module.exports = {
  getPosts: async (parent, args, context) => {
    const posts = await prisma.posts.findMany({
      include: {
        multimedia: true,
      },
    });

    if (posts.length) {
      return posts;
    }
  },
  getPostsOfUser: async (parent, args, context) => {
    if (args.input.myUserId && args.input.userId) {
      const response = await isAuth(
        async (user) => {
          console.log(user);

          const posts = await prisma.posts.findMany({
            orderBy: {
              createdAt: "desc",
            },

            where: {
              usersId: args.input.userId,
            },
            include: {
              comments: {
                include: {
                  users: true,
                },
              },
              bookmarkers: {
                include: {
                  users: true,
                },
              },
              multimedia: true,
              likes: {
                include: {
                  users: true,
                  media: true,
                },
              },
              users: {
                include: {
                  profile: true,
                  privacity: true,
                  creator: true,
                },
              },
            },
          });

          if (posts.length) {
            const userPrivacity = posts[0].users.privacity;
            if (user.id == args.input.userId || userPrivacity.profile === "all")
              return { success: true, errors: false, posts: posts };
            else if (userPrivacity.profile === "suscriptors") {
              const suscription = await prisma.suscriptions.findFirst({
                where: {
                  userId: user.id,
                  creatorId: args.input.userId,
                },
              });

              if (suscription)
                return { success: true, errors: false, posts: posts };
            }
          }

          return { success: true, errors: false, posts: [] };
        },
        (error) => ({
          errors: error,
          success: true,
        }),
        context,
        args.input.myUserId
      );

      return response;
    }
  },
};
