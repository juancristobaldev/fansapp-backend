const { getUrlMultimedia } = require("../../aws3Functions");
const isAuth = require("../../isAuth");
const { PrismaClient } = require("@prisma/client");
const { getRequestCreators } = require("../../queries/creators");
const { request } = require("../../..");
const prisma = new PrismaClient();

module.exports = {
  getAuth: async (parent, args, context) => {
    if (!context.authorization || !args.userId)
      return {
        isLoggedin: false,
      };

    return isAuth(
      async (user) => {
        try {
          const user = await prisma.user.findUnique({
            where: {
              id: args.userId,
              token: context.authorization,
            },
            include: {
              profile: true,
            },
          });

          let photo, frontPage;
          if (user.profile.photo)
            photo = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              user.profile.photo
            );
          if (user.profile.frontPage)
            frontPage = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              user.profile.frontPage
            );

          return {
            isLoggedin: true,
            user: {
              ...user,
              profile: {
                ...user.profile,
                photo,
                frontPage,
              },
            },
          };
        } catch (err) {
          return {
            isLoggedin: false,
          };
        }
      },
      () => ({
        isLoggedin: false,
      }),
      context,
      args.userId,
      true,
      "admin"
    );
  },
  getUser: async (parent, args, context) => {
    return isAuth(
      async () => {
        try {
          const user = await prisma.user.findFirst({
            where: {
              id: args.input.userId,
            },
            include: {
              profile: true,
              creator: {
                include: {
                  request: {
                    take: 1,
                    orderBy: {
                      createdAt: "desc",
                    },
                  },
                },
              },
            },
          });

          let photo, frontPage;
          let dniFront, dniBack;
          if (user.profile?.photo)
            photo = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              user.profile.photo
            );
          if (user.profile?.frontPage)
            frontPage = await getUrlMultimedia(
              process.env.AWS_BUCKET_NAME,
              user.profile.frontPage
            );

          let requestData;
          if (user.creator?.request?.length) {
            let request = user.creator.request[0];
            if (request.dniFront) {
              dniFront = await getUrlMultimedia(
                process.env.AWS_BUCKET_NAME,
                request.dniFront
              );
            }
            if (request.dniBack)
              dniBack = await getUrlMultimedia(
                process.env.AWS_BUCKET_NAME,
                request.dniBack
              );

            requestData = { ...request, dniBack, dniFront };
          }

          return {
            success: true,
            errors: false,
            user: {
              ...user,
              profile: {
                ...user.profile,
                photo,
                frontPage,
              },
              creator: {
                ...user.creator,
                request: requestData ? [requestData] : [],
              },
            },
          };
        } catch (e) {
          return {
            success: false,
            errors: e,
          };
        }
      },
      () => ({
        errors: "Not authorized",
        success: false,
      }),
      context,
      args.input.myId,
      true,
      "admin"
    );
  },
  getUsers: async (parent, args, context) => {
    if (!context.authorization || !args.input.userId)
      console.error("not authorized");

    const { take, skip } = args.input;

    return isAuth(
      async () => {
        const users = await prisma.user.findMany({
          skip: skip,
          take: take,
          orderBy: {
            createdAt: "desc",
          },
        });

        console.log("USERS->", users);

        return users;
      },
      () => console.error("not authorized"),
      context,
      args.input.userId,
      true,
      "admin"
    );
  },
  getRequestOfCreator: async (parent, args, context) => {
    console.log(args);
    if (!context.authorization || !args.input.userId || !args.input.itemId)
      return;

    console.log(args);

    const { take, skip } = args.input;

    return isAuth(
      async () => {
        const requests = await prisma.requestCreator.findMany({
          skip: skip,
          take: take,
          where: {
            creatorId: args.input.itemId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        console.log(requests);
        return requests;
      },
      () => ({
        errors: "Not authorized",
        success: false,
      }),
      context,
      args.input.userId,
      true,
      "admin"
    );
  },

  getRequestCreators: async (parent, args, context) => {
    if (!context.authorization || !args.input.userId)
      return {
        isLoggedin: false,
      };

    const { take, skip } = args.input;

    return isAuth(
      async () => {
        const creators = await prisma.creator.findMany({
          skip: skip,
          take: take,
          select: {
            id: true,
            approbedDate: true,
            request: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
            user: true,
          },
          where: {
            OR: [
              {
                request: {
                  some: {
                    status: "pending",
                  },
                },
              },
            ],
          },
        });

        return creators;
      },
      () => ({
        errors: "Not authorized",
        success: false,
      }),
      context,
      args.input.userId,
      true,
      "admin"
    );
  },
};
