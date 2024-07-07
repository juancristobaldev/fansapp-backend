const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const isAuth = require("../isAuth");
const getDatetime = require("../getDate");

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { updateCache } = require("../cache");
const { getUrlMultimedia } = require("../aws3Functions");
const suscriptions = require("./suscriptions");
const client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_PUBLIC_KEY,
    secretAccessKey: process.env.AWSSECRET_KEY,
  },
});

module.exports = {
  getAuth: async (parent, args, context) => {
    const { token, id, update = true } = args.input;

    console.log(token, id);

    if (token && id) {
      const user = await prisma.users.findUnique({
        where: {
          id: id,
          token: token,
        },
        include: {
          profile: true,
          creator: {
            include: {
              plans: {
                include: {
                  digitalProduct: {
                    select: {
                      creatorId: true,
                    },
                  },
                },
              },
              paidMessages: true,
              _count: {
                select: {
                  likes: true,
                  suscriptors: true,
                },
              },
            },
          },
          multimedia: {
            select: {
              id: true,
              type: true,
            },
          },
          notifications: true,
          suscriptions: true,
          customer: {
            include: {
              shopping: true,
              wallet: true,
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      console.log("USER COUNT POST ->", user._count);

      if (user) {
        let profile = { ...user.profile };

        if (user.profile.photo) {
          const objectParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: user.profile.photo,
          };

          const command = new GetObjectCommand(objectParams);

          const url = await getSignedUrl(client, command, { expiresIn: 3600 });

          profile.photo = url;
        }

        if (user.profile.frontPage) {
          const objectParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: user.profile.frontPage,
          };

          const command = new GetObjectCommand(objectParams);

          const url = await getSignedUrl(client, command, { expiresIn: 3600 });

          profile.frontPage = url;
        }

        let estadistics = {};
        if (user.creator) {
          const postsLength = user._count?.posts;
          const likesLength = user.creator?._count?.likes;

          let videosLength, imagesLength;

          if (user.multimedia.length) {
            videosLength = user.multimedia.filter(
              (multimedia) => multimedia.type === "video"
            ).length;
            imagesLength = user.multimedia.filter(
              (multimedia) => multimedia.type === "image"
            ).length;
            delete user.multimedia;
          }

          estadistics = {
            posts: postsLength,
            videos: videosLength,
            images: imagesLength,
            likes: likesLength,
            multimedias: user._count.multimedia,
          };
        }

        const session = await prisma.sessions
          .findFirst({
            where: {
              deviceName: `${context.userAgent.platform} ${context.userAgent.os}`,
              browser: context.userAgent.browser,
              source: context.userAgent.source,
              user: {
                id,
                token,
              },
            },
          })
          .catch((err) => console.err(err));

        if (session) {
          if (update)
            await prisma.sessions.update({
              where: {
                id: session.id,
              },
              data: {
                lastSessionAt: new Date(),
              },
            });

          console.log({
            ...user,
            profile: {
              ...profile,
            },
          });

          updateCache(`user-${id}-${context.authorization}`, { ...user });

          return {
            user: {
              ...user,
              estadistics,
              profile: {
                ...profile,
              },
            },
            isLoggedin: true,
          };
        }
      }
    }

    return {
      isLoggedin: false,
      user: false,
    };
  },
  searchUser: async (parent, args, context) => {
    if (args.input.username.length) {
      try {
        const lengthUsers = await prisma.users.count({
          where: {
            username: {
              mode: "insensitive",
              contains: args.input.username,
            },
          },
        });

        const users = await prisma.users.findMany({
          skip: args.input.skip || 0,
          take: args.input.take || 6,
          where: {
            username: {
              mode: "insensitive",
              contains: args.input.username,
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            createdAt: true,
            _count: {
              select: {
                posts: true,
                multimedia: true,
              },
            },
            profile: {
              select: {
                id: true,
                photo: true,
                description: true,
                frontPage: true,
              },
            },
            creator: {
              select: {
                plans: {
                  select: {
                    amount: true,
                  },
                },
                _count: {
                  select: {
                    likes: true,
                  },
                },
              },
            },
          },
        });

        console.log(users);

        const profiles = [];

        if (users.length) {
          for (const user of users) {
            try {
              let newProfile = {
                ...user.profile,
                user: {
                  ...user,
                  estadistics: {
                    multimedias: user._count.multimedia,
                    posts: user._count.posts,
                  },
                },
              };

              if (user.creator)
                newProfile.user.estadistics.likes = user.creator._count.likes;

              if (user.profile.photo)
                newProfile.photo = await getUrlMultimedia(
                  process.env.AWS_BUCKET_NAME,
                  user.profile.photo
                );
              if (user.profile.frontPage)
                newProfile.frontPage = await getUrlMultimedia(
                  process.env.AWS_BUCKET_NAME,
                  user.profile.frontPage
                );

              profiles.push(newProfile);
            } catch (error) {
              console.log(error);
            }
          }
        }

        return {
          profiles: profiles,
          nProfiles: lengthUsers,
        };
      } catch (error) {
        console.log(error);
      }

      console.log(profiles);
    }
  },

  getUser: async (parent, args, context) => {
    const { username, userId } = args.input;

    if (!username || !context.authorization)
      return {
        errors: ["not authorizated"],
        success: false,
      };

    let select = {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      gender: true,
      birthday: true,
      _count: {
        select: {
          multimedia: true,
          posts: true,
        },
      },
      multimedia: {
        select: {
          id: true,
          type: true,
        },
      },
      privacity: {
        select: {
          profile: true,
          messages: true,
        },
      },
      profile: {
        select: {
          photo: true,
          frontPage: true,
          description: true,
          language: true,
          location: true,
          instagram: true,
          tiktok: true,
        },
      },
      creator: {
        select: {
          id: true,
          suscriptors: true,
          _count: {
            select: {
              likes: true,
              saveds: true,
            },
          },
          plans: {
            select: {
              id: true,
              creator: true,
              creatorId: true,
              createdAt: true,
              updateAt: true,
              amount: true,
              yearlyAmount: true,
              yearlyAmountWithDiscount: true,
              monthlyAmountWithDiscount: true,
              discount: true,
              yearlyVisibility: true,
              visibility: true,
              type: true,
              suscriptors: true,
              digitalProduct: true,
              digitalProductId: true,
            },
          },
          paidMessages: true,
        },
      },
    };

    if (userId) {
      select.creator.select.saveds = {
        where: {
          usersId: userId,
        },
      };

      select.creator.select.suscriptors = {
        where: {
          AND: [{ userId: userId }, { status: 1 }],
        },
      };
    }

    const users = await prisma.users.findMany({
      where: {
        username: {
          equals: username,
        },
      },
      select: { ...select },
    });

    console.log(users);

    if (users.length) {
      let user = {
        ...users[0],
      };

      if (user.profile.photo)
        user.profile.photo = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          user.profile.photo
        );
      if (user.profile.frontPage)
        user.profile.frontPage = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          user.profile.frontPage
        );

      if (user.creator) {
        const postsLength = user._count?.posts;
        const likesLength = user.creator?._count?.likes;

        let videosLength, imagesLength;

        if (user.multimedia.length) {
          videosLength = user.multimedia.filter(
            (multimedia) => multimedia.type === "video"
          ).length;
          imagesLength = user.multimedia.filter(
            (multimedia) => multimedia.type === "image"
          ).length;
          delete user.multimedia;
        }

        user.estadistics = {
          posts: postsLength,
          videos: videosLength,
          images: imagesLength,
          likes: likesLength,
          multimedias: user._count.multimedia,
        };
      }

      return {
        success: true,
        errors: false,
        user: user,
      };
    }
  },
  getUserById: async (parent, args, context) => {
    const { id, medias, likes, comments } = args.input;

    console.log(args.input.id);
    if (id) {
      const user = await prisma.users.findUnique({
        where: {
          id: id,
        },
        include: {
          profile: true,
          comments: comments,
          likes: likes,
          medias: medias,
          _count: {
            select: {
              posts: true,
            },
          },
          creator: {
            include: {
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
        },
      });

      if (user) {
        return {
          success: true,
          error: false,
          user: {
            ...user,
            profile: {
              ...user.profile,
              nPosts: user._count.posts,
              nLikes: user.creator._count.likes,
            },
          },
        };
      } else {
        return {
          success: false,
          error: false,
        };
      }
    }

    return {
      success: false,
      error: ["El id es obligatorio"],
      user: false,
    };
  },
  getUsers: async (parent, args, context) => {
    const search = args.search;

    if (search?.length) {
      console.log(search);
      const users = await prisma.users.findMany({
        include: {
          profile: true,
          multimedia: true,
          creator: true,
        },
        where: {
          OR: [
            {
              firstName: {
                mode: "insensitive",
                contains: search.toLowerCase(),
              },
            },
            {
              lastName: {
                mode: "insensitive",
                contains: search.toLowerCase(),
              },
            },
            {
              username: {
                mode: "insensitive",
                contains: search.toLowerCase(),
              },
            },
          ],
        },
      });

      return users;
    }
    return [];
  },
  getBlockeds: async (parent, args, context) => {
    const response = await isAuth(
      async (user) => {
        const blockeds = await prisma.blockeds.findMany({
          where: {
            blockedBy: user.id,
          },
          include: {
            users: {
              include: {
                profile: true,
              },
            },
          },
        });

        console.log(blockeds);

        return blockeds;
      },
      (error) => error,
      context,
      args.userId
    );
    return response;
  },
  getSessions: async (parent, args, context) => {
    const error = {};
    const response = await isAuth(
      async (user) => {
        const sessions = await prisma.sessions.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            lastSessionAt: "desc",
          },
        });

        return sessions;
      },
      (error) => {
        return {
          errors: JSON.stringify({ error: "NOT AUTH" }),
          success: false,
        };
      },
      context,
      args.userId
    );

    return response;
  },
};
