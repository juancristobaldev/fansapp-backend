const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();
const fs = require("fs");
const { emitNotifications } = require("../pusher");

// Generar un nuevo token UUID

module.exports = {
  createPost: async (parent, args, context) => {
    if (args.input.userId && context.authorization) {
      console.log(args);

      const response = await isAuth(
        async (user) => {
          let digitalProduct = false;
          let multimedia;

          console.log(args.input.multimedias);

          if (args.input.multimedias && args.input.multimedias?.length) {
            multimedia = {
              connect: [...args.input.multimedias],
            };
          }

          const newData = { ...args.input };

          delete newData.userId;
          delete newData.multimedias;

          console.log(args.input);

          const post = await prisma.posts
            .create({
              data: {
                ...newData,
                multimedia: multimedia,
                usersId: args.input.userId,
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
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    profile: {
                      select: {
                        photo: true,
                      },
                    },
                  },
                },
              },
            })
            .catch((error) => console.error(error));

          console.log(args.input.amount, args.input.privacity, user.creator.id);

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
              user: {
                ...user,
                posts: [post],
              },
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
        args.input.userId,
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
    if (
      context.authorization &&
      args.input.idUser &&
      args.input.idPost &&
      args.input.idCreator
    ) {
      const { idUser, idPost, idCreator } = args.input;
      const errors = [];

      const likes = await prisma.likes.findFirst({
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

      console.log("LIKE");

      if (!likes) {
        const responsePrisma = await prisma.likes
          .create({
            data: {
              creatorId: idCreator,
              usersId: idUser,
              mediaId: idPost,
            },
            select: {
              id: true,
              usersId: true,
              creator: {
                select: {
                  userId: true,
                  user: {
                    select: {
                      notifications: true,
                    },
                  },
                },
              },
              users: {
                select: {
                  username: true,
                },
              },
              media: {
                select: {
                  id: true,
                  likes: {
                    where: {
                      usersId: idUser,
                    },
                    select: {
                      usersId: true,
                    },
                  },
                  _count: {
                    select: {
                      likes: true,
                      comments: true,
                    },
                  },
                },
              },
            },
          })
          .then(async (data) => {
            console.log("like creado->", data);
            try {
              console.log(
                data.creator.userId,
                idUser,
                data.creator.user.notifications
              );

              if (
                data.creator.userId !== idUser &&
                data.creator.user.notifications.likes
              ) {
                console.log("emitir notificacion");

                await emitNotifications(
                  data.creator.userId,
                  `Le ha dado like a tu publicacion`,
                  data,
                  "likes",
                  idUser
                );
              }

              return data;
            } catch (error) {
              console.log(error);
            }
          })

          .catch((error) => {
            console.log(error);
            errors.push(error);
          });

        console.log("response-prisma", responsePrisma);

        if (responsePrisma) {
          let newPost = {
            ...responsePrisma.media,
            likes: [
              ...responsePrisma.media.likes,
              { usersId: responsePrisma.usersId },
            ],
            nLikes: responsePrisma.media._count.likes,
            nComments: responsePrisma.media._count.comments,
          };

          console.log("newpost->,", newPost);

          delete newPost._count;

          return {
            success: true,
            errors: false,
            like: true,
            post: newPost,
          };
        }
      } else {
        const responsePrisma = await prisma.likes.delete({
          where: {
            id: likes.id,
          },
          select: {
            usersId: true,
            media: {
              select: {
                id: true,
                likes: {
                  where: {
                    usersId: idUser,
                  },
                  select: {
                    usersId: true,
                  },
                },
                _count: {
                  select: {
                    likes: true,
                    comments: true,
                  },
                },
              },
            },
          },
        });

        if (responsePrisma) {
          const newLikes =
            responsePrisma.media.likes.filter(
              (like) => like.usersId != responsePrisma.usersId
            ) || [];

          let newPost = {
            ...responsePrisma.media,
            likes: newLikes,
            nLikes: responsePrisma.media._count.likes - 1,
            nComments: responsePrisma.media._count.comments,
          };

          delete newPost._count;
          return {
            success: true,
            errors: false,
            like: false,
            post: newPost,
          };
        }
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

    console.log(context.authorization, idPost, idUser, content.length);

    if (!context.authorization || !idPost || !idUser || !content.length) {
      return {
        errors: JSON.stringify(["No authorizated"]),
        success: false,
        comment: false,
      };
    }

    console.log(args.input);

    const response = await isAuth(
      async (user) => {
        console.log(user);
        const post = await prisma.posts.findUnique({
          where: {
            id: idPost,
          },
          select: {
            id: true,
            privacity: true,
            digitalProductId: true,
            users: {
              select: {
                id: true,
                creator: {
                  select: {
                    suscriptors: {
                      select: {
                        userId: true,
                        status: true,
                      },
                      where: {
                        userId: {
                          equals: idUser,
                        },
                      },
                    },
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

        console.log("POST->", post);

        const createComment = async () => {
          const comment = await prisma.comments
            .create({
              data: {
                content: content,
                usersId: idUser,
                postsId: idPost,
              },
              select: {
                id: true,
                createdAt: true,
                content: true,
                users: {
                  select: {
                    username: true,
                  },
                },
                posts: {
                  select: {
                    id: true,
                    usersId: true,
                    users: {
                      select: {
                        notifications: true,
                      },
                    },
                    _count: {
                      select: {
                        likes: true,
                        comments: true,
                      },
                    },
                  },
                },
              },
            })
            .catch((error) => {
              errors.push(error);
            });

          console.log(comment.users.notifications);

          const newPost = {
            id: comment.posts.id,
            nComments: comment.posts._count.comments,
            nLikes: comment.posts._count.likes,
          };

          if (comment)
            if (
              comment.posts.usersId !== idUser &&
              comment.posts.users.notifications.comments
            ) {
              emitNotifications(
                comment.posts.usersId,
                `Ha comentado tu publicacion`,
                comment,
                "comments",
                idUser
              );
            }

          return {
            errors: false,
            success: true,
            comment: comment,
            post: newPost,
          };
        };

        if (
          (post.users.privacity.profile === "all" &&
            post.privacity === "public") ||
          post.users.id === idUser
        ) {
          return createComment();
        }

        if (
          post.users.privacity.profile === "suscriptors" &&
          post.privacity !== "paid"
        ) {
          const suscription = post.users.creator.suscriptors.filter(
            (suscriptor) => suscriptor.userId == idUser
          );

          if (suscription.length && suscription[0].status === 1) {
            return createComment();
          }
        }

        if (post.privacity == "paid") {
          const purchase = await prisma.sales.findFirst({
            where: {
              customer: {
                userId: {
                  equals: idUser,
                },
              },
              digitalProductId: {
                equals: post.digitalProductId,
              },
            },
          });

          if (purchase) {
            return createComment();
          }
        }

        return {
          errors: ["no authorizated"],
          success: false,
        };
      },
      (error) => ({ errors: JSON.stringify([`${error}`]) }),
      context,
      args.input.idUser
    );
    return response;
  },
};
