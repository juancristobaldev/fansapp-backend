const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    if (args.id) {
      console.log(args.id);
      const posts = await prisma.posts.findMany({
        orderBy: {
          createdAt: "desc",
        },

        where: {
          usersId: args.id,
        },
        include: {
          comments: {
            include: {
              users: true,
            },
          },
          bookmarkers: {
            include: {
              users: true,
            },
          },
          multimedia: true,
          likes: {
            include: {
              users: true,
              media: true,
            },
          },
          users: {
            include: {
              profile: true,
            },
          },
        },
      });

      console.log(posts);

      if (posts) {
        return {
          posts: posts,
          errors: false,
          success: true,
        };
      }
    } else {
      return {
        posts: false,
        errors: "NO ID USER",
        success: false,
      };
    }
  },
};
