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

const getPrivatedPost = (post) => {
  let newPosts = { ...post };
  newPosts.multimedia = [];

  return newPosts;
};

const verifyPrivacityPost = async (
  onSuccess,
  onNotSuccess,
  privacityProfile,
  privacityPost,
  post,
  userId
) => {
  const verifyBefore = getCacheData(`post-${post.id}`);
  if (
    (privacityProfile === "all" && privacityPost === "public") ||
    verifyBefore === 1
  ) {
    console.log("verify-before");
    return onSuccess(post);
  }

  if (privacityPost === "paid") {
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

  if (privacityPost === "suscriptors") {
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

    const getPosts = (postUserId) => {};

    const verifyPrivacity = () => {};

    if (myUserId) {
    }

    console.log(args.input);

    if (args.input.myUserId && args.input.userId) {
      const response = await isAuth(
        async (user) => {
          console.log(user);

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
            include: {
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
              bookmarkers: {
                where: {
                  usersId: user.id,
                },
                select: {
                  usersId: true,
                  id: true,
                },
              },
              multimedia: true,
              likes: {
                where: {
                  usersId: user.id,
                },
                select: {
                  usersId: true,
                  id: true,
                },
              },
              users: {
                select: {
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
            },
          });

          console.log(posts);

          const updateMultimedia = async (post, multimedias) => {
            let newPosts = { ...post };
            let newUsers = { ...post.users };

            if (!newUsers.profile.photo && !multimedias.length) return newPosts;

            console.log("NEW POSTS ->", post);

            if (newUsers.profile.photo) {
              const objectParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: post.users.profile.photo,
              };

              const command = new GetObjectCommand(objectParams);

              const url = await getSignedUrl(client, command, {
                expiresIn: 3600,
              });

              console.log("multimedi-url ->", url);

              newPosts = {
                ...newPosts,
                users: {
                  ...post.users,
                  profile: {
                    ...post.users.profile,
                    photo: url,
                  },
                },
              };
            }

            console.log("new post after ->", newPosts);

            if (post.multimedia.length) {
              const newMultimedia = [];

              for (const multimedia of multimedias) {
                try {
                  let newMultimediaUpdated = {
                    ...multimedia,
                  };

                  newMultimediaUpdated.source = await getUrlMultimedia(
                    process.env.AWS_BUCKET_NAME,
                    multimedia.source
                  );

                  if (multimedia.blur) {
                    newMultimediaUpdated.blur = await getUrlMultimedia(
                      process.env.AWS_BUCKET_NAME,
                      multimedia.blur
                    );
                  }

                  newMultimedia.push({
                    ...newMultimediaUpdated,
                  });
                } catch (error) {
                  console.log(error);
                }
              }

              console.log("NEW MULTIMEDIA ->,", newMultimedia);

              newPosts = { ...newPosts, multimedia: newMultimedia };
            }

            newPosts.nLikes = post._count.likes;
            newPosts.nComments = post._count.comments;

            delete newPosts._count;

            console.log("NEW POST -> ", newPosts);

            return newPosts;
          };

          console.log("POST LENGT-> ", posts.length);

          if (posts.length) {
            let newPosts = [];

            if (args.input.myUserId == args.input.userId) {
              console.log("MY POSTS");
              for (const post of posts) {
                try {
                  const newPostsData = await updateMultimedia(
                    post,
                    post.multimedia
                  );
                  console.log("POST DATA", newPostsData);
                  newPosts.push(newPostsData);
                } catch (error) {
                  console.log(error);
                }
              }
            } else {
              console.log("NOT MY POSTS");
              const profilePrivacity = posts[0].users.privacity.profile;

              if (profilePrivacity === "all") {
                for (const post of posts) {
                  if (post.privacity === "public") {
                    try {
                      const newPostsData = await updateMultimedia(
                        post,
                        post.multimedia
                      );

                      console.log("NEWPOST-PRIVACITY-PUBLIC", newPostsData);

                      newPosts.push({ ...newPostsData });
                    } catch (error) {
                      console.log(error);
                    }
                  }

                  if (post.privacity === "suscriptors") {
                    try {
                      const suscription = await prisma.suscriptions.findFirst({
                        where: {
                          creatorId: args.input.userId,
                          userId: user.id,
                        },
                      });

                      if (suscription) {
                        const newPostsData = await updateMultimedia(
                          post,
                          post.multimedia
                        );
                        newPosts.push({ ...newPostsData });
                      }
                    } catch (error) {
                      console.log(error);
                    }
                  }

                  if (post.privacity === "paid") {
                    try {
                      const customer = await prisma.customer.findFirst({
                        where: {
                          userId: user.id,
                        },
                        select: {
                          id: true,
                        },
                      });

                      if (customer) {
                        const purchase = await prisma.sales.findFirst({
                          where: {
                            digitalProduct: post.digitalProductId,
                            customerId: customer.id,
                          },
                        });

                        if (purchase) {
                          const newPostsData = updateMultimedia(
                            post,
                            post.multimedia
                          );
                          newPosts.push({ ...newPostsData });
                        }
                      }
                    } catch (error) {
                      console.log(error);
                    }
                  }
                }
              }
            }

            console.log("NEW POSTS ---->", newPosts);

            return {
              success: true,
              errors: false,
              posts: newPosts,
            };
          }

          return { success: true, errors: false, posts: [] };
        },
        (error) => ({
          errors: error,
          success: false,
        }),
        context,
        args.input.myUserId
      );

      return response;
    }
  },
  getCommentsByIdPost: async (parent, args, context) => {
    const { id, userId } = args.input;

    if (!userId && !id)
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

      (error) => ({ errors: `${error}`, success: false }),
      context,
      userId
    );

    return response;
  },
  getPostById: async (parent, args, context) => {
    const { id, userId } = args.input;

    if (!userId && !id)
      return {
        errors: "no authorizated",
        success: false,
      };

    const response = isAuth(
      async () => {
        const post = await prisma.posts.findUnique({
          where: {
            id: id,
          },
          select: {
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
            likes: {
              where: {
                usersId: userId,
              },
            },
            bookmarkers: {
              where: {
                usersId: userId,
              },
            },
            users: {
              select: {
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
        });

        return verifyPrivacityPost(
          async (post) => {
            await updateCache(`post-${post.id}`, 1);

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
      userId
    );

    return response;
  },
};
