const { getUrlMultimedia } = require("./aws3Functions");

const { updateCache, getCacheData } = require("./cache");
const { usePrisma } = require("./prisma");
const prisma = usePrisma;
module.exports = {
  verifyPrivacityPost: async (privacityPost, post, userId, details = true) => {
    const getPost = async (post) => {
      let newPost = { ...post };

      if (details) {
        newPost.creator.user.profile.photo = await getUrlMultimedia(
          process.env.AWS_BUCKET_NAME,
          post.creator.user.profile.photo
        );
        newPost.nLikes = post._count.likes;
        newPost.nComments = post._count.comments;
      }

      delete newPost._count;

      const multimedias = [];
      if (post.multimedia.length) {
        for (const multimedia of post.multimedia) {
          try {
            let newMultimedia = { ...multimedia };

            newMultimedia.source = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              multimedia.source
            );

            if (multimedia.blur) {
              newMultimedia.blur = await getUrlMultimedia(
                process.env.AWS_BUCKET_NAME,
                multimedia.blur
              );
            }

            if (multimedia.thumbnail) {
              newMultimedia.thumbnail = await getUrlMultimedia(
                process.env.AWS_BUCKET_NAME,
                multimedia.thumbnail
              );
            }

            multimedias.push(newMultimedia);
          } catch (error) {
            console.log(error);
          }
        }

        newPost.multimedia = multimedias;
      }

      return {
        isVisible: true,
        ...newPost,
      };
    };

    const getPrivatedPost = async (post) => {
      let newPost = { ...post };

      newPost.creator.user.profile.photo = await getUrlMultimedia(
        process.env.AWS_BUCKET_NAME,
        post.creator.user.profile.photo
      );

      newPost.nLikes = post._count.likes;
      newPost.nComments = post._count.comments;

      delete newPost._count;

      const multimedias = [];
      if (post.multimedia.length) {
        for (const multimedia of post.multimedia) {
          try {
            let newMultimedia = { ...multimedia };

            if (multimedia.blur) {
              const urlBlur = await getUrlMultimedia(
                process.env.AWS_BUCKET_NAME,
                multimedia.blur
              );
              if (multimedia.thumbnail) newMultimedia.thumbnail = urlBlur;

              newMultimedia.blur = urlBlur;
              newMultimedia.source = urlBlur;
            } else {
              newMultimedia.blur = null;
              newMultimedia.source = null;
            }

            multimedias.push(newMultimedia);
          } catch (error) {
            console.log(error);
          }
        }

        newPost.multimedia = multimedias;
      }

      return {
        isVisible: false,
        ...newPost,
      };
    };

    const verifyBefore = getCacheData(`post-${post.id}-${userId}`);

    if (
      post.creator.user.id === userId ||
      privacityPost === "public" ||
      verifyBefore === 1
    ) {
      await updateCache(`post-${post.id}-${userId}`, 1, 3600);
      return getPost(post);
    }

    if (privacityPost === "paid") {
      if (userId) {
        const customer = await prisma.customer.findFirst({
          where: {
            userId: userId,
          },
        });

        if (customer) {
          const purchase = await prisma.sale.findFirst({
            where: {
              digitalProductId: post.digitalProduct.id,
              customerId: customer.id,
              status: {
                equals: 2,
              },
            },
          });

          console.log("PURCHASE ->", purchase);

          if (purchase) {
            await updateCache(`post-${post.id}-${userId}`, 1, 3600);
            return getPost(post);
          }
        }
      }
    }

    if (privacityPost === "suscriptors") {
      if (userId) {
        const suscription = await prisma.suscription.findFirst({
          where: {
            userId: userId,
            creatorId: post.users.creator.id,
            status: {
              equals: 1,
            },
          },
        });

        if (suscription) {
          await updateCache(`post-${post.id}-${userId}`, 1, 3600);
          return getPost(post);
        }
      }
    }

    return getPrivatedPost(post);
  },
  verifyPrivacityPackage: async (creatorId, userId, album) => {
    const onVerify = async () => {
      const multimedias = [];

      for (let multimedia of album.multimedia) {
        try {
          let multimediaObject = { ...multimedia };

          multimediaObject.source = await getUrlMultimedia(
            process.env.AWS_BUCKET_NAME,
            multimedia.source
          );

          if (multimediaObject.blur)
            multimediaObject.blur = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              multimedia.blur
            );

          if (multimediaObject.thumbnail)
            multimediaObject.thumbnail = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              multimedia.thumbnail
            );

          multimedias.push(multimediaObject);
        } catch (e) {
          console.error(e);
        }
      }

      return { ...album, multimedia: multimedias, isVisible: true };
    };

    const notVerify = async () => {
      const multimedias = [];

      for (let multimedia of album.multimedia) {
        try {
          let multimediaObject = { ...multimedia };
          const blur = await getUrlMultimedia(
            process.env.AWS_BUCKET_NAME,
            multimedia.blur
          );

          multimediaObject.source = blur;
          multimediaObject.blur = blur;

          if (multimediaObject.thumbnail) multimediaObject.thumbnail = blur;
          console.log(multimediaObject);
          multimedias.push(multimediaObject);
        } catch (e) {
          console.error(e);
        }
      }

      return {
        ...album,
        multimedia: multimedias,
        isVisible: false,
      };
    };

    const user = await prisma.user.findFirst({
      where: {
        creator: {
          id: creatorId,
        },
      },
      select: {
        id: true,
        creator: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) return console.log("error user not find");
    if (album.privacity === "public" || user.id === userId) {
      console.log("IS PUBLIC OR IS MINE");
      return await onVerify();
    }
    if (album.privacity === "paid" || album.privacity === "suscriptors") {
      console.log("IS TO PAID OR IS TO SUSCRIPTORS");
      if (!userId) return notVerify();

      const customerId = await prisma.customer.findUnique({
        select: {
          id: true,
        },
        where: {
          userId: userId,
        },
      });
      console.log("CUSTOMERID", customerId.id);
      if (!customerId) return await notVerify();

      if (album.privacity === "paid") {
        console.log("IS TO PAID");
        try {
          const purchase = await prisma.sale.findFirst({
            where: {
              status: {
                equals: 2,
              },
              digitalProduct: {
                package: {
                  id: {
                    equals: album.id,
                  },
                },
              },
              customerId: {
                equals: customerId.id,
              },
            },
          });
          if (!purchase) return await notVerify();
          return await onVerify();
        } catch (e) {
          console.log(e);
        }
      }
      if (album.privacity === "suscriptors") {
        console.log("IS TO SUSCRIPTORS");
        const plansID = await prisma.packageOfPlan
          .findMany({
            where: {
              albumsId: {
                equals: album.id,
              },
            },
          })
          .then((data) => data.map((item) => item.id));

        const suscription = await prisma.suscription.findFirst({
          where: {
            status: 1,
            plansId: {
              in: plansID,
            },
          },
        });

        if (!suscription) return await notVerify();
        return await onVerify();
      }
    }
  },
};
