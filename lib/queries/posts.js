const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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
            take: 2,
            skip: skip >= 0 ? skip : 0,
            orderBy: {
              createdAt: "desc",
            },
            where: {
              users: {
                token: context.authorization,
              },
            },
            include: {
              bookmarkers: {
                where: {
                  usersId: user.id,
                },
                select: {
                  usersId: true,
                },
              },
              multimedia: true,
              likes: {
                where: {
                  usersId: user.id,
                },
                select: {
                  usersId: true,
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

          const updateMultimedia = async (post, multimedias) => {
            const newPosts = [];
            let newUsers = { ...post.users };
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

              newUsers.profile.photo = url;
            }

            if (post.multimedia.length) {
              const newMultimedia = [];

              for (const multimedia of multimedias) {
                const objectParams = {
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: multimedia.source,
                };

                const command = new GetObjectCommand(objectParams);

                const url = await getSignedUrl(client, command, {
                  expiresIn: 3600,
                });

                console.log("multimedi-url ->", url);

                newMultimedia.push({
                  ...multimedia,
                  source: url,
                });
              }

              newPosts.push({
                ...post,
                multimedia: newMultimedia,
                users: {
                  ...newUsers,
                },
              });
            }

            return newPosts;
          };

          if (posts.length) {
            let newPosts = [];

            if (user.id == args.input.userId) {
              for (const post of posts) {
                const newPostsData = await updateMultimedia(
                  post,
                  post.multimedia
                );
                newPosts.push(...newPostsData);
              }
            } else {
              const profilePrivacity = posts[0].users.privacity.profile;

              if (profilePrivacity === "all") {
                for (const post of posts) {
                  if (post.privacity === "public") {
                    const newPostsData = await updateMultimedia(
                      post,
                      post.multimedia
                    );
                    newPosts.push(...newPostsData);
                  }

                  if (post.privacity === "suscriptors") {
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
                      newPosts.push(...newPostsData);
                    }
                  }

                  if (post.privacity === "paid") {
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
                        newPosts.push(...newPostsData);
                      }
                    }
                  }
                }
              }
            }

            console.log({
              success: true,
              errors: false,
              posts: newPosts,
            });

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
};
