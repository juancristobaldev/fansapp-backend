const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getUrlMultimedia } = require("../aws3Functions");
const { updateCache, getCacheData } = require("../cache");
const client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_PUBLIC_KEY,
    secretAccessKey: process.env.AWSSECRET_KEY,
  },
});
// Generar un nuevo token UUID

const getPost = async (post) => {
  let newPost = { ...post };
  newPost.users.profile.photo = await getUrlMultimedia(
    process.env.AWS_BUCKET_NAME,
    post.users.profile.photo
  );

  newPost.nLikes = post._count.likes;
  newPost.nComments = post._count.comments;

  delete newPost._count;

  const multimedias = [];
  if (post.multimedia.length) {
    for (const multimedia of post.multimedia) {
      try {
        let newMultimedia = { ...multimedia };
        newMultimedia.source = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          multimedia.source
        );

        if (multimedia.blur) {
          newMultimedia.blur = await getUrlMultimedia(
            process.env.AWS_BUCKET_NAME,
            multimedia.blur
          );
        }

        multimedias.push(newMultimedia);
      } catch (error) {
        console.log(error);
      }
    }

    newPost.multimedia = multimedias;
  }

  return newPost;
};

const getPrivatedPost = async (post) => {
  let newPost = { ...post };
  newPost.users.profile.photo = await getUrlMultimedia(
    process.env.AWS_BUCKET_NAME,
    post.users.profile.photo
  );

  newPost.nLikes = post._count.likes;
  newPost.nComments = post._count.comments;

  delete newPost._count;

  const multimedias = [];
  if (post.multimedia.length) {
    for (const multimedia of post.multimedia) {
      try {
        let newMultimedia = { ...multimedia };

        if (multimedia.blur) {
          const urlBlur = await getUrlMultimedia(
            process.env.AWS_BUCKET_NAME,
            multimedia.blur
          );

          newMultimedia.blur = urlBlur;
          newMultimedia.source = urlBlur;
        } else {
          newMultimedia.blur = null;
          newMultimedia.source = null;
        }

        multimedias.push(newMultimedia);
      } catch (error) {
        console.log(error);
      }
    }

    newPost.multimedia = multimedias;
  }

  return newPost;
};

const verifyPrivacityPost = async (
  onSuccess,
  onNotSuccess,
  privacityProfile,
  privacityPost,
  post,
  userId
) => {
  const verifyBefore = getCacheData(`post-${post.id}-${userId}`);

  if (post.users.id === userId) return onSuccess(post);

  if (
    (privacityProfile === "all" && privacityPost === "public") ||
    verifyBefore === 1
  ) {
    console.log("verify-before");
    return onSuccess(post);
  }

  if (privacityPost === "paid") {
    if (userId) {
      const customer = await prisma.customer.findFirst({
        where: {
          userId: userId,
        },
      });

      if (customer) {
        const purchase = await prisma.sales.findFirst({
          where: {
            digitalProductId: post.digitalProductId,
          },
        });

        if (purchase) {
          return onSuccess(post);
        }
      }
    }
  }

  if (privacityPost === "suscriptors") {
    if (userId) {
      const suscription = await prisma.suscriptions.findFirst({
        where: {
          userId: userId,
          creatorId: post.users.creator.id,
          status: {
            equals: 1,
          },
        },
      });

      if (suscription) {
        return onSuccess(post);
      }
    }
  }

  return onNotSuccess(post);
};

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
    const { skip, first, myUserId } = args.input;

    console.log(args.input);

    if (args.input.userId) {
      const response = await isAuth(
        async (user) => {
          console.log(user);

          let include = {
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
            multimedia: true,
            users: {
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
              },
            },
          };

          if (myUserId) {
            include.likes = {
              where: {
                usersId: myUserId,
              },
              select: {
                usersId: true,
                id: true,
              },
            };

            include.bookmarkers = {
              where: {
                usersId: myUserId,
              },
              select: {
                usersId: true,
                id: true,
              },
            };
          }

          const posts = await prisma.posts.findMany({
            take: 3,
            skip: skip >= 0 ? skip : 0,
            orderBy: {
              createdAt: "desc",
            },
            where: {
              users: {
                id: args.input.userId,
              },
            },
            include: { ...include },
          });

          if (posts.length) {
            const privacityUserProfile = posts[0].users.privacity.profile;

            const newPosts = [];

            if (privacityUserProfile === "suscriptors") {
              if (!myUserId)
                return {
                  success: true,
                  errors: false,
                  posts: [],
                };

              const suscription = await prisma.suscriptions.findFirst({
                where: {
                  status: {
                    equals: 1,
                  },
                  userId: {
                    equals: myUserId,
                  },
                  creator: {
                    userId: {
                      equals: args.input.userId,
                    },
                  },
                },
              });

              if (suscription) {
                for (const post of posts) {
                  try {
                    let newPost = verifyPrivacityPost(
                      async (post) => {
                        if (myUserId) {
                          await updateCache(
                            `post-${post.id}-${myUserId}`,
                            1,
                            3600
                          );
                        }

                        return await getPost(post);
                      },
                      async (post) => getPrivatedPost(post),
                      post.users.privacity.profile,
                      post.privacity,
                      post,
                      myUserId
                    );

                    newPosts.push(newPost);
                  } catch (error) {
                    console.log(error);
                  }
                }
              }
            }

            if (privacityUserProfile === "all") {
              for (const post of posts) {
                try {
                  let newPost = verifyPrivacityPost(
                    async (post) => {
                      if (myUserId) {
                        await updateCache(
                          `post-${post.id}-${myUserId}`,
                          1,
                          3600
                        );
                      }

                      return await getPost(post);
                    },
                    async (post) => getPrivatedPost(post),
                    post.users.privacity.profile,
                    post.privacity,
                    post,
                    myUserId
                  );

                  newPosts.push(newPost);
                } catch (error) {
                  console.log(error);
                }
              }
            }

            console.log("NEW POSTS -> ", newPosts);

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
    }
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
        const comments = await prisma.comments.findMany({
          take: 3,
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
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },

        users: {
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
        digitalProductId: true,
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
        const post = await prisma.posts.findUnique({
          where: {
            id: id,
          },
          select: {
            ...select,
          },
        });

        return verifyPrivacityPost(
          async (post) => {
            if (userId) {
              await updateCache(`post-${id}-${userId}`, 1, 3600);
            }
            console.log("POST -> ", post);

            return await getPost(post);
          },
          async (post) => getPrivatedPost(post),
          post.users.privacity.profile,
          post.privacity,
          post,
          userId
        );
      },

      (error) => ({ errors: `${error}`, success: false }),
      context,
      userId,
      false
    );

    return response;
  },
};
