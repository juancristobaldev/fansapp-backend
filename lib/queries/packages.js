const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const { getUrlMultimedia } = require("../aws3Functions");
const prisma = new PrismaClient();

const verifyPrivacityPackage = async (creatorId, userId, package) => {
  const onVerify = async () => {
    const multimedias = [];

    for (let multimedia of package.multimedia) {
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

    return { ...package, multimedia: multimedias };
  };
  const notVerify = () => {};

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
  if (package.privacity === "public" || user.id === userId) {
    const packagesVerified = await onVerify();

    console.log("PACKAGES VERIFIED --->", packagesVerified);

    return packagesVerified;
  }
};

module.exports = {
  getNull: async () => {
    return {
      success: true,
      errors: false,
    };
  },
  getPackagesByCreator: async (parent, args, context) => {
    const { userId, creatorId } = args.input;
    if (!creatorId) return null;

    return isAuth(
      async (user) => {
        const packages = await prisma.package.findMany({
          skip: 0,
          take: 4,
          where: {
            creatorId,
            visibility: true,
          },
          include: {
            multimedia: {
              take: 1,
            },
          },
        });

        let newPackages = [];

        for (const package of packages) {
          try {
            const newPackage = await verifyPrivacityPackage(
              creatorId,
              userId,
              package
            );
            newPackages.push(newPackage);
          } catch (e) {
            console.log(e);
          }
        }

        return newPackages;
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
        const package = await prisma.package.findUnique({
          where: {
            id: id,
          },
          include: {
            multimedia: {
              skip: skip || 0,
              take: take || undefined,
            },
          },
        });

        let newPackage = await verifyPrivacityPackage(
          creatorId,
          userId,
          package
        );

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
