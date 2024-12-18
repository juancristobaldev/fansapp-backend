const { usePrisma } = require("../prisma");
const prisma = usePrisma;
const isAuth = require("../isAuth");
const { getUrlMultimedia } = require("../aws3Functions");
const {
  verifyPrivacityPackage,
  verifyPrivacityPost,
} = require("../verifyFunctions");

// Generar un nuevo token UUID

module.exports = {
  getBookmarksByType: async (parent, args, context) => {
    if (!args.input.type || !args.input.userId)
      return {
        errors: "args.input.type and args.input.userId required",
        success: false,
      };

    let query = {
      select: {
        id: true,
        usersId: true,
        packages: false,
        post: false,
        creator: false,
      },
      where: {
        usersId: args.input.userId,
      },
    };

    switch (args.input.type) {
      case "creator":
        query.where.creatorId = { not: null };
        query.select.creator = {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profile: {
                  select: {
                    photo: true,
                    frontPage: true,
                  },
                },
              },
            },
          },
        };
        break;
      case "posts":
        query.where.postsId = { not: null };
        query.select.post = {
          select: {
            id: true,
            privacity: true,
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
            creator: {
              select: {
                user: {
                  select: {
                    profile: {
                      select: {
                        photo: true,
                      },
                    },
                  },
                },
              },
            },
            multimedia: {
              take: 1,
              select: {
                thumbnail: true,
                source: true,
                blur: true,
                type: true,
              },
            },
          },
        };
        break;
      case "package":
        query.where.packageId = { not: null };
        query.select.packages = {
          select: {
            id: true,
            multimedia: {
              take: 1,
              select: {
                thumbnail: true,
                blur: true,
                source: true,
                type: true,
              },
            },
          },
        };
        break;
    }
    console.log(query);
    const response = await isAuth(
      async (user) => {
        try {
          let newBookmarkers = [];
          let bookmarkers = await prisma.bookmarker.findMany({
            orderBy: {
              createdAt: "desc",
            },
            ...query,
          });

          if (!bookmarkers.length) {
            return { success: false, errors: "not bookmarkers" };
          }

          for (let bookmarker of bookmarkers) {
            if (bookmarker.creator) {
              if (bookmarker.creator.user?.profile.photo)
                creator.user.profile.photo = await getUrlMultimedia(
                  process.env.AWS_BUCKET_NAME,
                  creator.user.profile.photo
                );
              if (bookmarker.creator.user?.profile.frontPage)
                creator.user.profile.frontPage = await getUrlMultimedia(
                  process.env.AWS_BUCKET_NAME,
                  creator.user.profile.frontPage
                );

              bookmarker.creator = creator;
            } else if (bookmarker.packages)
              bookmarker.packages = await verifyPrivacityPackage(
                album.creatorId,
                user.id,
                album
              );
            else if (bookmarker.post)
              bookmarker.post = await verifyPrivacityPost(
                bookmarker.post.privacity,
                bookmarker.post,
                user.id,
                false
              );

            newBookmarkers.push(bookmarker);
          }

          return {
            success: true,
            errors: false,
            bookmarkers: newBookmarkers,
          };
        } catch (e) {
          console.log(e);
          return {
            success: false,
            errors: e,
          };
        }
      },
      (error) => ({
        errors: error,
        success: false,
      }),
      context,
      args.input.userId,
      true
    );

    return response;
  },
};
