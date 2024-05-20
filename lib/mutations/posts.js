const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();
const fs = require("fs");
// Generar un nuevo token UUID

module.exports = {
  createPost: async (parent, args, context) => {
    if (args.input.userId || context.authorization) {
      const response = await isAuth(
        async (user) => {
          let digitalProduct = false;

          const post = await prisma.posts
            .create({
              data: {
                ...args.input,
                usersId: user.id,
              },
              include: {
                bookmarkers: {
                  include: {
                    users: true,
                  },
                },
                multimedia: true,
                comments: {
                  include: {
                    users: true,
                  },
                },
                likes: {
                  include: {
                    users: true,
                  },
                },
                users: {
                  include: {
                    profile: true,
                  },
                },
              },
            })
            .catch((error) => console.error(error));

          if (
            post &&
            args.input.amount > 0 &&
            args.input.privacity === "paid"
          ) {
            digitalProduct = await prisma.digitalProduct.create({
              data: {
                creatorId: user.creator.id,
                post: {
                  connect: {
                    id: post.id,
                  },
                },
              },
            });
          }

          console.log(digitalProduct);

          if (post) {
            return {
              errors: false,
              success: true,
              posts: { ...post },
            };
          } else {
            return {
              errors: "Error to create post",
              success: false,
            };
          }
        },
        (error) => ({
          errors: JSON.stringify([error]),
          success: true,
        }),
        context,
        args.input.usersId,
        {
          creator: true,
        }
      );

      return response;
    } else {
      return {
        errors: JSON.stringify(["ID - Token is required"]),
        success: fasle,
      };
    }
  },
  updatePost: async (parent, args, context) => {
    const { id, userId, privacity, description, multimedia, amount, location } =
      args.input;

    if (!id || (!userId && context.authorization))
      return {
        success: false,
        errors: "missing fields in request",
      };

    if (
      !privacity &&
      !description &&
      !multimedia.length &&
      !amount &&
      !location
    )
      return {
        success: false,
        errors: "missing some update field request",
      };

    const response = await isAuth(
      async (user) => {
        console.log(user);

        const oldPost = await prisma.posts.findUnique({
          where: {
            id: id,
            usersId: userId,
          },
          include: {
            multimedia: true,
          },
        });

        if (
          !multimedia.length &&
          oldPost.description == description &&
          amount === oldPost.amount &&
          privacity === oldPost.privacity &&
          location === oldPost.location
        ) {
          return {
            success: false,
            errors: "post equal to old post",
          };
        }

        let errors = [];

        if (multimedia.length) {
          const ids = multimedia.map((multimedias) => multimedias.id);

          console.log("IDSDELETE", ids);

          const response = await prisma.multimedia
            .deleteMany({
              where: {
                id: {
                  in: [...ids],
                },
              },
            })
            .then((data) => {
              console.log(data);
              if (data.count > 0) {
                const paths = multimedia.map(
                  (multimedias) => multimedias.source
                );

                let errorsPath = [];

                console.log(paths, errorsPath);

                paths.forEach((path) => {
                  if (fs.existsSync(path)) {
                    fs.unlinkSync(path);
                    console.log("Eliminado correctamente:", path);
                  } else {
                    errorsPath.push(path, "_not found");
                  }
                });

                if (errorsPath.length)
                  return { success: false, errors: JSON.stringify([errors]) };
                else
                  return {
                    success: true,
                    errors: false,
                  };
              }
            })
            .catch((error) => errors.push(error));

          if (!response.success) {
            return response;
          }

          let newData = {};

          if (privacity && privacity !== oldPost.privacity)
            newData.privacity = privacity;
          if (amount && amount !== oldPost.amount) newData.amount = amount;
          if (description && description !== oldPost.description)
            newData.description = description;
          if (location && location !== oldPost.location)
            newData.location = location;

          if (JSON.stringify(newData) !== JSON.stringify({})) {
            const newPost = await prisma.posts
              .update({
                where: {
                  id: id,
                  usersId: userId,
                },
                data: {
                  ...newData,
                },
                include: {
                  bookmarkers: {
                    include: {
                      users: true,
                    },
                  },
                  multimedia: true,
                  comments: {
                    include: {
                      users: true,
                    },
                  },
                  likes: {
                    include: {
                      users: {
                        include: {
                          profile: true,
                        },
                      },
                    },
                  },
                },
              })
              .catch((error) => errors.push(error));

            if (errors.length)
              return {
                errors: JSON.stringify(errors),
                success: false,
              };

            console.log({
              errors: false,
              success: true,
              user: {
                ...user,
                posts: [newPost],
              },
            });

            return {
              errors: false,
              success: true,
              user: {
                ...user,
                posts: [...newPost],
              },
            };
          }
        }
      },
      (error) => ({
        success: false,
        errors: JSON.stringify([error]),
      }),
      context,
      userId
    );

    return response;
  },
  deletePost: async (parent, args, context) => {
    if (!context.authorization && !args.input.userId)
      return {
        success: false,
        errors: "Auth failed",
      };

    const response = await isAuth(
      async (user) => {
        const errors = [];

        const multimedias = await prisma.multimedia.findMany({
          where: {
            postsId: args.input.postId,
          },
        });

        console.log("MULTIMEDIAS->", multimedias);

        if (multimedias.length) {
          const paths = multimedias.map((multimedia) => multimedia.source);

          let errorsPath = [];

          paths.forEach((path) => {
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
              console.log("Eliminado correctamente:", path);
            } else {
              errorsPath.push(path, "_not found");
            }
          });
        }

        posts = await prisma.posts
          .delete({
            where: {
              id: args.input.postId,
            },
          })
          .then((data) => {
            const posts = prisma.posts.findMany({
              where: {
                usersId: user.id,
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
                    privacity: true,
                    creator: true,
                  },
                },
              },
            });

            return posts;
          })
          .catch((error) => errors.push(error));

        console.log(posts);

        if (errors.length) {
          return {
            success: false,
            errors: JSON.stringify(errors),
          };
        } else {
          return {
            success: true,
            user: {
              ...user,
              posts: [...posts],
            },
          };
        }
      },
      (error) => ({
        errors: JSON.stringify([error]),
        success: false,
      }),
      context,
      args.input.userId
    );

    return response;
  },
  likePost: async (parent, args, context) => {
    console.log(context.authorization);
    if (
      context.authorization &&
      args.input.idUser &&
      args.input.idPost &&
      args.input.idCreator
    ) {
      console.log(args.input);

      const { idUser, idPost, idCreator } = args.input;
      const errors = [];

      const likes = await prisma.likes.findMany({
        where: {
          creator: {
            id: idCreator,
          },
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
              creatorId: idCreator,
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
