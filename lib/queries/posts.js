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
            take: 3,
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
                } catch (error) {
                  console.log(error);
                }
              }

              console.log("NEW MULTIMEDIA ->,", newMultimedia);

              newPosts = { ...newPosts, multimedia: newMultimedia };
            }

            console.log(newPosts);

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
