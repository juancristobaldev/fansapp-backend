const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = {
  getAuth: async (parent, args, context) => {
    const { token, id } = args.input;

    console.log(token, id);
    70;

    if (token && id) {
      const user = await prisma.users.findUnique({
        where: {
          id: id,
          token: token,
        },
      });

      if (user) {
        return {
          isLoggedin: true,
          user: user,
        };
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
      users = await prisma.users.findMany({
        where: {
          token: context.authorizatio,
        },
        include: {
          profile: true,
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
    const users = await prisma.users.findMany({
      include: {
        profile: true,
      },
    });
    return users;
  },
};
