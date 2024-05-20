const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

// Generar un nuevo token UUID

module.exports = {
  getSuscriptions: async (parent, args, context) => {
    const where = {};

    if (args.status != null) {
      where.status = args.status;
    }

    const response = await prisma.suscriptions.findMany({
      where: where,
    });
    return response;
  },
  getSuscriptionsOfUser: async (parent, args, context) => {
    const response = await isAuth(
      async (user) => {
        let error;

        const suscriptions = await prisma.suscriptions
          .findMany({
            where: {
              userId: user.id,
            },
            include: {
              creator: {
                include: {
                  details: true,
                  _count: {
                    select: {
                      likes: true,
                    },
                  },
                  user: {
                    include: {
                      _count: {
                        select: {
                          posts: true,
                        },
                      },
                      profile: true,
                      multimedia: true,
                    },
                  },
                },
              },
            },
          })
          .catch((errorPrisma) => (error = errorPrisma));

        if (suscriptions.length) {
          suscriptions.forEach((suscription) => {
            console.log(suscription.creator.user);

            const multimedias = suscription.creator.user.multimedia;

            const postsLength = suscription.creator.user._count.posts;
            const likesLength = suscription.creator._count.likes;
            let videosLength, imagesLength;

            if (multimedias.length) {
              videosLength = multimedias.filter(
                (multimedia) => multimedia.type === "video"
              ).length;
              imagesLength = multimedias.filter(
                (multimedia) => multimedia.type === "image"
              ).length;
            }

            suscription.creator.lengthJSON = JSON.stringify({
              postsLength,
              videosLength,
              imagesLength,
              likesLength,
            });
          });
        }

        if (!error) {
          return {
            errors: false,
            success: true,
            suscriptions: suscriptions,
          };
        } else {
          return {
            errors: error,
            success: false,
          };
        }
      },
      (error) => ({ errors: error, success: false }),
      context,
      args.userId
    );
    return response;
  },
};
