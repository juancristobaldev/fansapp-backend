const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const getDatetime = require("../getDate");

const prisma = new PrismaClient();

module.exports = {
  getAuth: async (parent, args, context) => {
    const { token, id } = args.input;

    console.log(token, id);

    if (token && id) {
      const user = await prisma.users.findUnique({
        where: {
          id: id,
          token: token,
        },
        include: {
          profile: true,
          creator: true,
        },
      });

      if (user) {
        const session = await prisma.sessions
          .findFirst({
            where: {
              deviceName: `${context.userAgent.platform} ${context.userAgent.os}`,
              source: context.userAgent.source,
              user: {
                id,
                token,
              },
            },
          })
          .catch((err) => console.err(err));

        if (session) {
          await prisma.sessions.update({
            where: {
              id: session.id,
            },
            data: {
              lastSessionAt: new Date(),
            },
          });

          return {
            isLoggedin: true,
            user: user,
          };
        }
      }
    } else
      return {
        isLoggedin: false,
        user: false,
      };
  },
  getUser: async (parent, args, context) => {
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
          profile: true,
          creator: true,
          privacity: true,
        },
      });
      if (users.length) {
        return {
          success: true,
          errors: false,
          user: users[0],
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
    console.log("getSessions", context);
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
