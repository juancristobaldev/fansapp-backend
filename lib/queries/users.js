const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const getDatetime = require("../getDate");

const prisma = new PrismaClient();

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
            },
          },
          suscriptions: true,
          privacity: true,
          multimedia: true,
          customer: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      if (user) {
        if (user.creator) {
          console.log(user);

          const postsLength = user._count.posts;

          let jsonLength = {
            postsLength: 0,
            videosLength: 0,
            imagesLength: 0,
          };

          if (postsLength > 0) {
            jsonLength.postsLength = postsLength;
          }

          console.log(user.multimedia.length);

          if (user.multimedia.length) {
            const multimedias = user.multimedia;
            delete user.multimedia;

            let videosLength, imagesLength;

            videosLength = multimedias.filter(
              (multimedia) => multimedia.type === "video"
            ).length;
            imagesLength = multimedias.filter(
              (multimedia) => multimedia.type === "image"
            ).length;

            jsonLength = { ...jsonLength, videosLength, imagesLength };
          }

          user.creator.lengthJSON = JSON.stringify(jsonLength);
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

        console.log("USER", user);
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

          return {
            user: user,
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
    console.log("ARGS", args);
    let users;
    if (context.authorization) {
      let where = {
        id: null,
        token: null,
      };

      if (args.id) {
        where = {
          id: args.id,
        };
      } else {
        where = {
          token: context.authorization,
        };
      }

      console.log(args);
      users = await prisma.users.findMany({
        where: where,
        include: {
          multimedia: true,
          profile: true,
          creator: {
            include: {
              saveds: true,
              plans: true,
              paidMessages: true,
              suscriptors: args.id ? true : false,
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
          privacity: true,
          suscriptions: true,
        },
      });

      console.log("get-user->", users);

      if (users.length) {
        let user = { ...users[0] };

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
    } else
      return {
        success: false,
        errors: "No Header Authorization",
        user: false,
      };
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
