const isAuth = require("../isAuth");
const { emitNotifications } = require("../pusher");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;
// Generar un nuevo token UUID

module.exports = {
  createPost: async (parent, args, context) => {
    if (args.input.userId && context.authorization) {
      console.log(args);

      const response = await isAuth(
        async (user) => {
          try {
            let digitalProduct;
            let multimedia;
            let postsOfPlans = {
              createMany: {
                data: [],
              },
            };
            let hashtags = {
              create: [],
            };

            if (args.input.multimedias && args.input.multimedias?.length) {
              multimedia = {
                connect: [...args.input.multimedias],
              };
            }

            if (args.input.amount > 0 && args.input.privacity === "paid") {
              digitalProduct = {
                create: {
                  creator: {
                    connect: {
                      userId: args.input.userId,
                    },
                  },
                  amount: args.input.amount,
                },
              };
            }

            if (args.input.plans?.length) {
              postsOfPlans.createMany.data = args.input.plans.map((item) => ({
                plansId: item.id,
              }));
            }

            if (args.input.hashtags?.length) {
              const hashtagsValues = args.input.hashtags.map(
                (hashtag) => hashtag.hashtag
              );

              const existingHashtags = await prisma.hashtag.findMany({
                where: {
                  hashtag: {
                    in: hashtagsValues,
                  },
                },
              });

              const existingsHashtagsValues = existingHashtags.map(
                (hashtag) => hashtag.hashtag
              );
              const notExistsHashtagsValues = hashtagsValues.filter(
                (hashtag) => !existingsHashtagsValues.includes(hashtag)
              );

              if (notExistsHashtagsValues.length) {
                const data = notExistsHashtagsValues.map((item) => ({
                  hashtag: item,
                }));
                console.log("creando hashtags");
                const response = await prisma.hashtag
                  .createMany({
                    data: [...data],
                  })
                  .then((data) => {
                    if (data.count === notExistsHashtagsValues.length) {
                      return {
                        success: true,
                      };
                    } else {
                      console.log("error to create hashtags");
                      return {
                        success: false,
                      };
                    }
                  });

                if (!response.success)
                  return {
                    errors: "error to create",
                    success: false,
                  };
              }

              const hashtagsIDS = await prisma.hashtag
                .findMany({
                  where: {
                    hashtag: {
                      in: args.input.hashtags.map((hashtag) => hashtag.hashtag),
                    },
                  },
                })
                .then((data) => {
                  return data.map((item) => ({ hashtagId: item.id }));
                });

              hashtags = {
                create: [...hashtagsIDS],
              };
            }

            const newData = { ...args.input };

            delete newData.userId;
            delete newData.multimedias;
            delete newData.amount;
            delete newData.plans;
            delete newData.hashtags;

            console.log(args.input);

            const post = await prisma.post
              .create({
                data: {
                  ...newData,
                  multimedia: multimedia,
                  postsOfPlans: postsOfPlans,
                  digitalProduct: digitalProduct,
                  hashtags: hashtags,
                  creator: {
                    connect: {
                      userId: args.input.userId,
                    },
                  },
                },
                include: {
                  hashtags: true,
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
                  creator: {
                    select: {
                      id: true,
                      user: {
                        select: {
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
                  },
                },
              })
              .catch((error) => console.error(error));

            if (post) {
              return {
                errors: false,
                success: true,
                user: {
                  ...user,
                  creator: {
                    ...user.creator,
                    posts: [post],
                  },
                },
              };
            } else {
              return {
                errors: "Error to create post",
                success: false,
              };
            }
          } catch (e) {
            console.log(e);
            return {
              success: false,
              errors: e,
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
    const {
      id,
      userId,
      privacity,
      description,
      multimedia,
      amount,
      location,
      plans,
      hashtags,
    } = args.input;

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
      !location &&
      !hashtags.length
    )
      return {
        success: false,
        errors: "missing some update field request",
      };

    const response = await isAuth(
      async (user) => {
        try {
          let newData = {},
            errors = [],
            digitalProduct = null,
            uniqueInNews = [],
            uniqueInOld = [],
            idsUniqueInNews = [],
            idsUniqueInOld = [];

          let newPost;
          const oldPost = await prisma.post.findUnique({
            where: {
              id: id,
              creator: {
                userId: userId,
              },
            },
            include: {
              postsOfPlans: true,
              multimedia: true,
              digitalProduct: {
                select: {
                  id: true,
                  amount: true,
                },
              },
              hashtags: {
                include: {
                  hashtag: true,
                },
              },
            },
          });

          if (oldPost.hashtags.length || hashtags.length) {
            const newsHashtags = hashtags.map((hashtag) => hashtag.hashtag);
            const oldsHashtags = oldPost.hashtags.map(
              (item) => item.hashtag.hashtag
            );

            console.log("NEWS HASHTAGS->", newsHashtags);
            console.log("OLDS HASHTAGS->", oldsHashtags);

            const hashtagNews = newsHashtags.filter(
              (hashtag) => !oldsHashtags.includes(hashtag)
            );

            const hashtagToDelete = oldsHashtags.filter(
              (hashtag) => !newsHashtags.includes(hashtag)
            );

            console.log("HASHTAGS TO DELETE->", hashtagToDelete);
            console.log("HASHTAGS TO CREATE->", hashtagNews);

            if (hashtagToDelete.length) {
              const response = await prisma.hashTagPosts
                .deleteMany({
                  where: {
                    hashtag: {
                      hashtag: {
                        in: hashtagToDelete,
                      },
                    },
                  },
                })
                .then((data) => {
                  if (data.count === 0) {
                    console.log("error to eliminate hashtags");
                    return {
                      errors: "error to eliminate hashtags",
                      success: false,
                    };
                  }
                  return {
                    success: true,
                  };
                });
              if (!response.success) return response;
            }

            if (hashtagNews.length) {
              newData.hashtags = {
                create: hashtagNews.map((hashtagNew) => ({
                  hashtag: {
                    connectOrCreate: {
                      where: {
                        hashtag: hashtagNew,
                      },
                      create: {
                        hashtag: hashtagNew,
                      },
                    },
                  },
                })),
              };
            }
          }

          if (oldPost.postsOfPlans.length || plans.length) {
            const newsId = plans.map((item) => item.id);
            const oldIds = oldPost.postsOfPlans.map(
              (postOfPlan) => postOfPlan.plansId
            );

            idsUniqueInOld = oldIds.filter((id) => !newsId.includes(id));
            idsUniqueInNews = newsId.filter((id) => !oldIds.includes(id));

            if (idsUniqueInNews.length) {
              newData.postsOfPlans = {
                createMany: {
                  data: idsUniqueInNews.map((id) => ({
                    plansId: id,
                  })),
                },
              };
            }

            if (idsUniqueInOld.length) {
              const response = await prisma.postOfPlan
                .deleteMany({
                  where: {
                    postsId: oldPost.id,
                    plansId: {
                      in: idsUniqueInOld,
                    },
                  },
                })
                .then(async (data) => {
                  console.log(data);
                  if (data.count > 0) {
                    return {
                      success: true,
                    };
                  } else {
                    return {
                      errors: "error to eliminate relations posts-of-plans",
                      success: false,
                    };
                  }
                })
                .catch((error) => errors.push(error));

              if (!response.success) return response;
            }
          }

          if (oldPost.multimedia.length || multimedia.length) {
            const newsId = multimedia.map((multimedias) => multimedias.id);
            const oldMultimedias = oldPost.multimedia.map(
              (multimedia) => multimedia.id
            );

            uniqueInNews = newsId.filter((id) => !oldMultimedias.includes(id));

            if (uniqueInNews.length) {
              newData.multimedia = {
                connect: uniqueInNews.map((news) => ({ id: news })),
              };
            }

            uniqueInOld = oldMultimedias.filter((id) => !newsId.includes(id));

            if (uniqueInOld.length) {
              const response = await prisma.multimedia
                .deleteMany({
                  where: {
                    id: {
                      in: [...uniqueInOld],
                    },
                  },
                })
                .then(async (data) => {
                  console.log(data);
                  if (data.count > 0) {
                    return {
                      success: true,
                    };
                  } else {
                    return {
                      errors: "error to eliminate",
                      success: false,
                    };
                  }
                })
                .catch((error) => errors.push(error));

              if (!response.success) {
                return response;
              }
            }
          }
          console.log(oldPost.description, description);
          console.log(oldPost.digitalProduct?.amount, amount);
          console.log(oldPost.privacity, privacity);
          console.log(oldPost.location, location);
          console.log(uniqueInOld.length);
          console.log(uniqueInNews.length);

          if (
            oldPost.description == description &&
            oldPost.digitalProduct?.amount === amount &&
            privacity === oldPost.privacity &&
            !uniqueInOld.length &&
            !uniqueInNews.length &&
            !idsUniqueInNews.length &&
            !idsUniqueInOld
          ) {
            console.log("post equal to old post");
            return {
              success: false,
              errors: "post equal to old post",
            };
          }

          if (
            oldPost.privacity === "paid" &&
            privacity === "paid" &&
            amount !== oldPost.digitalProduct?.amount
          ) {
            newData.digitalProduct = {
              update: {
                data: {
                  amount: amount,
                },
                where: {
                  id: oldPost.digitalProductId,
                },
              },
            };
          }

          if (oldPost.privacity === "public" && privacity !== "public") {
            if (privacity == "suscriptors" && plans.length) {
              newData.postsOfPlans = {
                createMany: {
                  data: uniqueInNews.map((item) => ({
                    plansId: item.id,
                  })),
                },
              };
            }
            if (privacity === "paid" && amount) {
              const digitalProduct = await prisma.digitalProduct.create({
                data: {
                  amount: amount,
                  creatorId: user.creator.id,
                },
              });

              newData.digitalProduct = {
                connect: {
                  id: digitalProduct.id,
                },
              };
            }
          }

          if (
            (oldPost.privacity === "paid" && privacity !== "paid") ||
            (oldPost.privacity === "suscriptors" && privacity !== "suscriptors")
          )
            return {
              success: false,
              errors:
                "No puedes actualizar el ajuste de  privacidad de este post",
            };

          if (privacity && privacity !== oldPost.privacity)
            newData.privacity = privacity;
          if (description && description !== oldPost.description)
            newData.description = description;
          if (location && location !== oldPost.location)
            newData.location = location;

          console.log("NEW DATA", newData);
          if (JSON.stringify(newData) !== JSON.stringify({})) {
            console.log("CREATOR-ID----->", user.creator.id);

            newPost = await prisma.post
              .update({
                where: {
                  id: id,
                  creator: {
                    userId: userId,
                  },
                },
                data: {
                  ...newData,

                  /*
                  {
                connectOrCreate: hashtagNews.map((hashtag) => ({
                  create: {
                    hashtag: {
                      create: {
                        hashtag: hashtag,
                      },
                    },
                  },
                })),
              }
                  */
                },
                include: {
                  digitalProduct: true,
                  bookmarkers: {
                    include: {
                      users: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                  multimedia: true,
                  comments: {
                    include: {
                      users: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                  likes: {
                    include: {
                      users: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              })
              .catch((error) => {
                console.log(error);
                return {
                  errors: error,
                };
              });
            if (newPost.errors)
              return {
                errors: newPost.errors,
                success: false,
              };

            if (digitalProduct) {
              newPost.digitalProduct = digitalProduct;
            }
          }
          return {
            errors: false,
            success: true,
          };
        } catch (e) {
          console.log(e);
        }
      },
      (error) => ({
        success: false,
        errors: JSON.stringify([error]),
      }),
      context,
      userId,
      true,
      "creator"
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
        console.log(user);
        try {
          const errors = [];

          const posts = await prisma.post
            .delete({
              where: {
                id: args.input.postId,
                creatorId: user.creator.id,
              },
            })
            .then((data) => {
              const posts = prisma.post.findMany({
                where: {
                  creatorId: user.creator.id,
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
                  creator: {
                    include: {
                      user: {
                        include: {
                          profile: true,
                          privacity: true,
                        },
                      },
                    },
                  },
                },
              });

              return posts;
            })
            .catch((error) => {
              console.log(error);
              errors.push(error);
            });

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
                creator: {
                  ...user.creator,
                  posts: [...posts],
                },
              },
            };
          }
        } catch (e) {
          console.log(e);
        }
      },
      (error) => ({
        errors: JSON.stringify([error]),
        success: false,
      }),
      context,
      args.input.userId,
      true,
      "creator"
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

      const likes = await prisma.like.findFirst({
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
        const responsePrisma = await prisma.like
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
        const responsePrisma = await prisma.like.delete({
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
        const bookmarkers = await prisma.bookmarker.findMany({
          where: {
            usersId: idUser,
            postsId: idPost,
          },
        });

        if (bookmarkers.length) {
          const bookmarker = await prisma.bookmarker
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
          const bookmarker = await prisma.bookmarker
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
        const post = await prisma.post.findUnique({
          where: {
            id: idPost,
          },
          select: {
            id: true,
            privacity: true,
            digitalProductId: true,
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
                user: {
                  select: {
                    id: true,
                    privacity: {
                      select: {
                        profile: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        console.log("POST->", post);

        const createComment = async () => {
          const comment = await prisma.comment
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
                    creator: {
                      select: {
                        user: {
                          select: {
                            id: true,
                            notifications: true,
                          },
                        },
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
              comment?.posts.creator.user.id !== idUser &&
              comment?.posts.creator.user.notifications.comments
            ) {
              emitNotifications(
                comment.posts.creator.user.id,
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
          (post.creator.user.privacity.profile === "all" &&
            post.creator.user.privacity === "public") ||
          post.creator.user.id === idUser
        ) {
          return createComment();
        }

        if (
          post.creator.user.privacity.profile === "suscriptors" &&
          post.privacity !== "paid"
        ) {
          const suscription = post.creator.suscriptors.filter(
            (suscriptor) => suscriptor.userId == idUser
          );

          if (suscription.length && suscription[0].status === 1) {
            return createComment();
          }
        }

        if (post.privacity == "paid") {
          const purchase = await prisma.sale.findFirst({
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
