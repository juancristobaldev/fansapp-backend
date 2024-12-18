const isAuth = require("../isAuth");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;

module.exports = {
  createPackage: async (parent, args, context) => {
    const { userId, multimedia, albumsOfPlans, privacity, amount } = args.input;
    if (!userId || !multimedia.length || !privacity)
      return {
        errors: "not authorized",
        success: false,
      };

    return await isAuth(
      async (user) => {
        try {
          let albumsOfPlansArray;
          let digitalProduct;

          switch (privacity) {
            case "suscriptors":
              albumsOfPlansArray = {
                connect: albumsOfPlans,
              };
              break;
            case "paid":
              if (amount === 0)
                return {
                  errors: "not amount",
                  success: false,
                };

              digitalProduct = {
                create: {
                  creator: {
                    connect: {
                      userId: userId,
                    },
                  },
                  amount: amount,
                },
              };
              break;
          }

          const package = await prisma.package.create({
            data: {
              privacity: privacity,
              creator: {
                connect: {
                  userId: userId,
                },
              },
              multimedia: {
                connect: multimedia,
              },
              albumsOfPlans: albumsOfPlansArray,
              digitalProduct: digitalProduct,
            },
          });
          console.log(package);

          return {
            success: true,
            errors: false,
            package: package,
          };
        } catch (err) {
          console.error(err);
        }
      },
      (err) => {
        console.log(err);
        return {
          errors: "not authorized",
          success: false,
        };
      },
      context,
      userId,
      true,
      "creator"
    );
  },
  deletePackage: async (parent, args, context) => {
    const { userId, packageId } = args.input;
    if (!userId || !packageId) return null;
    return await isAuth(
      (user) => {},
      (err) => {
        console.log(err);
        return null;
      },
      context,
      userId,
      true,
      "creator"
    );
  },
  updatePackage: async (parent, args, context) => {
    const { userId, packageId, multimedia, privacity, amount, albumsOfPlans } =
      args.input;
    console.log(args.input);
    if (
      !userId ||
      !packageId ||
      !multimedia.length ||
      (privacity === "paid" && !amount)
    )
      return {
        success: false,
        errors: "not authorized",
      };
    return await isAuth(
      async (user) => {
        try {
          console.log(user);

          const oldPackage = await prisma.package.findUnique({
            where: {
              id: packageId,
            },
            include: {
              multimedia: {
                select: {
                  id: true,
                },
              },
              albumsOfPlans: true,
              digitalProduct: true,
            },
          });

          let idsMultimediaUniquesInOld,
            idsMultimediaUniquesInNews,
            idsPlansUniquesInOld,
            idsPlansUniquesInNews;

          let newData = {};

          if (oldPackage.multimedia.length || multimedia.length) {
            const multimediaId = multimedia.map((item) => item.id);
            const oldsMultimediaIds = oldPackage.multimedia.map(
              (item) => item.id
            );

            idsMultimediaUniquesInOld = oldsMultimediaIds.filter(
              (id) => !multimediaId.includes(id)
            );
            idsMultimediaUniquesInNews = multimediaId.filter(
              (id) => !oldsMultimediaIds.includes(id)
            );

            if (idsMultimediaUniquesInOld.length) {
              await prisma.multimedia
                .deleteMany({
                  where: {
                    id: {
                      in: idsMultimediaUniquesInOld,
                    },
                  },
                })
                .catch((error) => {
                  console.log(error, "error to eliminate");
                  return {
                    success: false,
                    errors: "error to eliminate",
                  };
                });
            }

            if (idsMultimediaUniquesInNews.length) {
              newData.multimedia = {
                connect: idsMultimediaUniquesInNews.map((news) => ({
                  id: news,
                })),
              };
            }
          }

          switch (privacity) {
            case "paid":
              if (!oldPackage.digitalProductId) {
                newData.digitalProduct = {
                  create: {
                    amount: amount,
                    creatorId: user.creator.id,
                  },
                };
              } else {
                newData.digitalProduct = {
                  update: {
                    where: {
                      id: oldPackage.digitalProductId,
                    },
                    data: {
                      amount: amount,
                    },
                  },
                };
              }
              break;
            case "suscriptors":
              if (oldPackage.albumsOfPlans.length || albumsOfPlans.length) {
                const plansId = albumsOfPlans.map((item) => item.id);
                const oldsPlansId = oldPackage.albumsOfPlans.map(
                  (item) => item.plansId
                );

                idsPlansUniquesInNews = plansId.filter(
                  (item) => !oldsPlansId.includes(item)
                );
                idsPlansUniquesInOld = oldsPlansId.filter(
                  (item) => !plansId.includes(item)
                );

                if (idsPlansUniquesInOld.length) {
                  await prisma.packageOfPlan
                    .deleteMany({
                      where: {
                        albumsId: oldPackage.id,
                        plansId: {
                          in: idsPlansUniquesInOld,
                        },
                      },
                    })
                    .catch((error) => {
                      console.log(error, "error to eliminate packageOfPlan");
                      return {
                        success: false,
                        errors: "error to eliminate packageOfPlan",
                      };
                    });
                }

                if (idsPlansUniquesInNews.length)
                  newData.multimedia = {
                    createMany: {
                      data: idsPlansUniquesInNews.map((item) => ({
                        plansId: item.id,
                      })),
                    },
                  };
              }
              break;
          }
          if (privacity && privacity !== oldPackage.privacity)
            newData.privacity = privacity;

          let newPackage;
          if (JSON.stringify({}) !== JSON.stringify(newData)) {
            newPackage = await prisma.package
              .update({
                where: {
                  id: packageId,
                },
                data: {
                  ...newData,
                },
                include: {
                  digitalProduct: true,
                  albumsOfPlans: true,
                },
              })
              .catch((e) => {
                console.log(e);
              });
          }

          console.log(newPackage);

          return {
            success: true,
            errors: false,
          };
        } catch (e) {
          console.log(e);
          return {
            errors: e,
            success: false,
          };
        }
      },
      (err) => {
        console.log(err);
        return null;
      },
      context,
      userId,
      true,
      "creator"
    );
  },
};
