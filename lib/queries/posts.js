const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getUrlMultimedia } = require("../aws3Functions");
const { updateCache, getCacheData } = require("../cache");
const { verifyPrivacityPost } = require("../verifyFunctions");
const client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_PUBLIC_KEY,
    secretAccessKey: process.env.AWSSECRET_KEY,
  },
});
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
    const { skip, take, myUserId, previews } = args.input;

    if (!args.input.userId)
      return {
        success: false,
        errors: "not authorized",
      };

    const response = await isAuth(
      async (user) => {
        console.log(user);

        let select = {
          id: true,
          description: true,
          createdAt: true,
          privacity: true,

          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
          multimedia: true,
          digitalProduct: true,
          hashtags: {
            select: {
              id: true,
              postId: true,
              hashtag: true,
              hashtagId: true,
            },
          },
          creator: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  profile: {
                    select: {
                      photo: true,
                    },
                  },
                  privacity: {
                    select: {
                      profile: true,
                    },
                  },
                  creator: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        };

        if (myUserId) {
          select.likes = {
            where: {
              usersId: myUserId,
            },
            select: {
              usersId: true,
              id: true,
            },
          };

          select.bookmarkers = {
            where: {
              usersId: myUserId,
            },
            select: {
              usersId: true,
              id: true,
            },
          };
        }
        let where = {};
        if (previews) {
          select = {
            id: true,
            description: true,
            createdAt: true,
            privacity: true,
            multimedia: true,
            digitalProduct: true,
            creator: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          };
          where = {
            privacity: "public",
            multimedia: { some: {} },
          };
        }

        const posts = await prisma.post.findMany({
          take: take || 3,
          skip: skip >= 0 ? skip : 0,
          orderBy: {
            createdAt: "desc",
          },
          where: {
            creator: {
              userId: args.input.userId,
            },
            ...where,
          },
          select: { ...select },
        });
        console.log(posts);
        if (posts.length) {
          const newPosts = [];

          for (const post of posts) {
            try {
              let newPost = await verifyPrivacityPost(
                post.privacity,
                post,
                myUserId,
                !previews
              );

              newPosts.push(newPost);
            } catch (error) {
              console.log(error);
            }
          }

          return {
            success: true,
            errors: false,
            posts: newPosts,
          };
        } else {
          return {
            success: true,
            errors: false,
            posts: [],
          };
        }
      },
      (error) => ({
        errors: error,
        success: false,
      }),
      context,
      args.input.myUserId,
      false
    );

    return response;
  },
  getCommentsByIdPost: async (parent, args, context) => {
    const { id, userId } = args.input;

    if (!id)
      return {
        errors: "no authorizated",
        success: false,
      };

    console.log(args.input);

    const response = isAuth(
      async (user) => {
        const comments = await prisma.comment.findMany({
          take: 5,
          skip: args.input?.skip ? args.input.skip : 0,
          where: {
            postsId: id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            users: {
              select: {
                username: true,
              },
            },
          },
        });

        return comments;
      },

      (error) => [JSON.stringify(error)],
      context,
      userId,
      false
    );

    return response;
  },
  getPostById: async (parent, args, context) => {
    const { id, userId } = args.input;

    if (!id)
      return {
        errors: "no authorizated",
        success: false,
      };

    let select = {
      ...{
        id: true,
        createdAt: true,
        description: true,
        multimedia: true,
        privacity: true,
        digitalProduct: {
          select: {
            id: true,
            amount: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        hashtags: {
          select: {
            id: true,
            hashtag: true,
            hashtagId: true,
            postId: true,
          },
        },
        creator: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                username: true,
                lastName: true,
                profile: {
                  select: {
                    photo: true,
                  },
                },
                creator: {
                  select: {
                    id: true,
                  },
                },
                privacity: true,
              },
            },
          },
        },
        digitalProductId: true,
        postsOfPlans: true,
      },
    };

    if (userId) {
      select.likes = {
        where: {
          usersId: userId,
        },
      };
      select.bookmarkers = {
        where: {
          usersId: userId,
        },
      };
    }

    const response = isAuth(
      async () => {
        const post = await prisma.post.findUnique({
          where: {
            id: id,
          },
          select: {
            ...select,
          },
        });

        return verifyPrivacityPost(post.privacity, post, userId);
      },

      (error) => ({ errors: `${error}`, success: false }),
      context,
      userId,
      false
    );

    return response;
  },
};
