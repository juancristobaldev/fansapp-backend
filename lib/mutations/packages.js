const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

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
          let albumsOfPlans;
          let digitalProduct;

          switch (privacity) {
            case "suscriptors":
              albumsOfPlans = {
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
              albumsOfPlans: albumsOfPlans,
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
      false,
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
      false,
      "creator"
    );
  },
  updatePackage: async (parent, args, context) => {
    const { userId, packageId, multimedia } = args.input;
    if (!userId || !packageId || !multimedia.length) return null;
    return await isAuth(
      (user) => {},
      (err) => {
        console.log(err);
        return null;
      },
      context,
      userId,
      false,
      "creator"
    );
  },
};
