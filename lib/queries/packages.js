const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const { getUrlMultimedia } = require("../aws3Functions");
const { verifyPrivacityPackage } = require("../verifyFunctions");
const prisma = new PrismaClient();

module.exports = {
  getNull: async () => {
    return {
      success: true,
      errors: false,
    };
  },
  getPackagesByCreator: async (parent, args, context) => {
    const { userId, creatorId, skip, take } = args.input;
    if (!creatorId) return null;

    return isAuth(
      async (user) => {
        const [packages, countPackages] = await prisma.$transaction([
          prisma.package.findMany({
            skip: skip || 0,
            take: take || 4,
            where: {
              creatorId,
              visibility: true,
            },
            include: {
              multimedia: {
                take: 1,
              },
            },
          }),
          prisma.package.count({
            where: {
              creatorId,
            },
          }),
        ]);

        let newPackages = [];

        for (const album of packages) {
          try {
            const newPackage = await verifyPrivacityPackage(
              creatorId,
              userId,
              album
            );

            newPackages.push(newPackage);
          } catch (e) {
            console.log(e);
          }
        }

        return {
          success: true,
          errors: false,
          packages: newPackages,
          count: countPackages,
        };
      },
      (err) => {
        console.error(err);
        return null;
      },
      context,
      userId,
      false
    );
  },
  getPackagesDetails: async (parent, args, context) => {
    const { userId, creatorId } = args.input;
    if (!creatorId || !userId) return null;

    return isAuth(
      (user) => {},
      (err) => {
        console.error(err);
        return null;
      },
      context,
      userId,
      true,
      "creator"
    );
  },
  getPackageById: async (parent, args, context) => {
    const { id, userId, creatorId, skip, take } = args.input;

    if (!creatorId || !id) return null;

    return isAuth(
      async (user) => {
        const album = await prisma.package.findUnique({
          where: {
            id: id,
          },
          include: {
            digitalProduct: true,
            albumsOfPlans: true,
            multimedia: {
              skip: skip || 0,
              take: take || undefined,
            },
          },
        });

        let newPackage = await verifyPrivacityPackage(creatorId, userId, album);

        return newPackage;
      },
      (err) => {
        console.error(err);
        return null;
      },
      context,
      userId,
      false
    );
  },
};
