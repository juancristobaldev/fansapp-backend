const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

// Generar un nuevo token UUID

module.exports = {
  getBookmarksByType: async (parent, args, context) => {
    if (!args.input.type && args.input.userId)
      return {
        errors: "args.input.type and args.input.userId required",
        success: false,
      };

    let filter = {};
    let include = {};

    if (args.input.type === "creator") {
      filter.creatorId = {
        not: null,
      };
      include = {
        creator: {
          include: {
            _count: {
              select: {
                likes: true,
              },
            },
            details: true,
            user: {
              include: {
                multimedia: true,
                _count: {
                  select: {
                    posts: true,
                  },
                },
                profile: true,
              },
            },
          },
        },
      };
    }
    if (args.input.type === "posts") {
      filter.postsId = {
        not: null,
      };
      include = {
        post: {
          include: {
            bookmarkers: {
              include: {
                users: true,
              },
            },
            likes: {
              include: {
                users: true,
              },
            },
            comments: {
              include: {
                users: true,
              },
            },
            multimedia: true,
            users: {
              include: {
                profile: true,
                creator: {
                  include: {
                    suscriptors: true,
                  },
                },
              },
            },
          },
        },
      };
    }

    const response = await isAuth(
      async (user) => {
        let error;
        const bookmarkers = await prisma.bookmarkers
          .findMany({
            orderBy: {
              createdAt: "desc",
            },
            where: {
              usersId: user.id,
              ...filter,
            },
            include: include,
          })
          .catch((errorPrisma) => (error = errorPrisma));

        if (bookmarkers.length && args.input.type === "creator") {
          console.log(bookmarkers);
          bookmarkers.forEach((item) => {
            const multimedias = item.creator.user.multimedia;

            const postsLength = item.creator.user._count.posts;
            const likesLength = item.creator._count.likes;
            let videosLength, imagesLength;

            if (multimedias.length) {
              videosLength = multimedias.filter(
                (multimedia) => multimedia.type === "video"
              ).length;
              imagesLength = multimedias.filter(
                (multimedia) => multimedia.type === "image"
              ).length;
            }

            delete item.creator.user.multimedia;

            item.creator.lengthJSON = JSON.stringify({
              postsLength,
              videosLength,
              imagesLength,
              likesLength,
            });
          });
        }

        if (!error) {
          return {
            success: true,
            errors: false,
            bookmarkers: bookmarkers,
          };
        }

        return {
          success: false,
          errors: error,
        };
      },
      (error) => ({
        errors: error,
        success: false,
      }),
      context,
      args.input.userId
    );

    return response;
  },
};
