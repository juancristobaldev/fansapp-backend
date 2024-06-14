const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const getDatetime = require("../getDate");

const prisma = new PrismaClient();

const { GetObjectCommand, S3Client, getSig } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { updateCache } = require("../cache");
const { getUrlMultimedia } = require("../aws3Functions");
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
              plans: true,
              paidMessages: true,
              _count: {
                select: {
                  likes: true,
                  suscriptors: true,
                },
              },
            },
          },
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

          updateCache(id, { ...user });

          return {
            user: {
              ...user,
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
  getUser: async (parent, args, context) => {
    const { username, userId } = args.input;

    if (!username || !userId || !context.authorization)
      return {
        errors: ["not authorizated"],
        success: false,
      };

    const users = await prisma.users.findMany({
      where: {
        username: {
          equals: username,
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthday: true,
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
            _count: {
              select: {
                likes: true,
                saveds: true,
              },
            },
            saveds: {
              where: {
                usersId: userId,
              },
            },
            plans: true,
            paidMessages: true,
            suscriptors: {
              where: {
                AND: [{ userId: userId }, { status: 1 }],
              },
            },
          },
        },
      },
    });
    console.log(users);

    if (users.length) {
      let user = { ...users[0] };

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

        user.creator.lengthJSON = JSON.stringify({
          postsLength,
          videosLength,
          imagesLength,
          likesLength,
        });
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
          creator: true,
        },
      });

      if (user) {
        return {
          success: true,
          error: false,
          user: user,
        };
      } else {
        return {
          success: false,
          error: false,
          user: user,
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
