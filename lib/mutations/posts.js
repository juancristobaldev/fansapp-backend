const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Generar un nuevo token UUID

module.exports = {
  createPost: async (parent, args, context) => {
    if (context.authorization) {
      const user = await prisma.users.findUnique({
        where: {
          token: context.authorization,
        },
      });

      if (user) {
        const id = user.id;

        const post = await prisma.posts
          .create({
            data: {
              ...args.input,
              usersId: id,
            },
          })
          .catch((error) => console.error(error));

        if (post) {
          return {
            errors: false,
            success: true,
            post: post,
          };
        } else {
          return {
            errors: "Error to create post",
            success: false,
            post: false,
          };
        }
      } else {
        return {
          errors: "No User Found",
          success: false,
          post: false,
        };
      }
    } else
      return {
        errors: "No Token Authorization",
        success: false,
        post: false,
      };
  },
  likePost: async (parent, args, context) => {
    console.log(context.authorization);
    if (context.authorization && args.input.idUser && args.input.idPost) {
      console.log(args.input);

      const { idUser, idPost } = args.input;
      const errors = [];

      const likes = await prisma.likes.findMany({
        where: {
          users: {
            id: idUser,
          },
          media: {
            id: idPost,
          },
        },
      });

      if (!likes[0]?.id) {
        const responsePrisma = await prisma.likes
          .create({
            data: {
              usersId: idUser,
              mediaId: idPost,
            },
            include: {
              media: {
                include: {
                  likes: {
                    include: {
                      users: true,
                    },
                  },
                },
              },
            },
          })
          .then((data) => {
            return data;
          })
          .catch((error) => errors.push(error));

        if (responsePrisma)
          return {
            success: true,
            errors: false,
            like: true,
            likes: responsePrisma.media.likes,
          };
      } else {
        const responsePrisma = await prisma.likes.delete({
          where: {
            id: likes[0].id,
          },
          include: {
            media: {
              include: {
                likes: {
                  include: {
                    users: true,
                  },
                },
              },
            },
          },
        });

        console.log("delete", responsePrisma.media.likes);
        if (responsePrisma)
          return {
            success: true,
            errors: false,
            like: false,
            likes: responsePrisma.media.likes.filter(
              (item) => item.id !== likes[0].id
            ),
          };
      }

      return {
        success: false,
        errors: JSON.stringify(errors),
      };
    }
  },
  savePost: async (parent, args, context) => {
    const errors = [];
    if (context.authorization) {
      const { idUser, idPost } = args.input;

      if (args.input.idUser && args.input.idPost) {
        const bookmarkers = await prisma.bookmarkers.findMany({
          where: {
            usersId: idUser,
            postsId: idPost,
          },
        });

        if (bookmarkers.length) {
          const bookmarker = await prisma.bookmarkers
            .delete({
              where: {
                id: bookmarkers[0].id,
              },
            })
            .then(() => {
              return true;
            });
          if (bookmarker)
            return {
              errors: JSON.stringify(errors),
              success: true,
              isSaved: false,
            };
        } else {
          const bookmarker = await prisma.bookmarkers
            .create({
              data: {
                usersId: args.input.idUser,
                postsId: args.input.idPost,
              },
            })
            .then(() => {
              return true;
            })
            .catch((error) => errors.push(error));

          if (bookmarker)
            return {
              errors: JSON.stringify(errors),
              success: true,
              isSaved: true,
            };
        }
      } else errors.push("No found ID USER / ID POST");
    } else errors.push("NO TOKEN USER");
    return {
      errors: JSON.stringify(errors),
      success: false,
    };
  },
  createComment: async (parent, args, context) => {
    const errors = [];
    const { idPost, idUser, content } = args.input;
    if (context.authorization) {
      if (idPost && idUser && content.length) {
        const comment = await prisma.comments
          .create({
            data: {
              content: content,
              usersId: idUser,
              postsId: idPost,
            },
            include: {
              users: true,
            },
          })
          .catch((error) => {
            errors.push(error);
          });

        if (!errors.length) {
          if (comment) {
            console.log(comment);
            return {
              errors: false,
              success: true,
              comment: comment,
            };
          }
        } else {
          return {
            errors: JSON.stringify(errors),
            success: false,
            comment: comment,
          };
        }
      } else {
        return {
          errors: JSON.stringify(["No Content | No User ID | No Post ID"]),
          success: false,
          comment: false,
        };
      }
    } else {
      return {
        errors: JSON.stringify(["No  TOKEN AUTHORIZATION"]),
        success: false,
        comment: false,
      };
    }
  },
};
