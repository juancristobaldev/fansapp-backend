const isAuth = require("../isAuth");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;

// Generar un nuevo token UUID

module.exports = {
  getCreators: async (parent, args, context) => {
    const where = {
      status: "creator",
      user: {
        OR: [
          {
            firstName: {
              mode: "insensitive",
              contains: args.search.toLowerCase(),
            },
          },
          {
            lastName: {
              mode: "insensitive",
              contains: args.search.toLowerCase(),
            },
          },
          {
            username: {
              mode: "insensitive",
              contains: args.search.toLowerCase(),
            },
          },
        ],
      },
    };

    if (!args.search) delete where.user;

    const creators = await prisma.creator.findMany({
      where: where,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return creators;
  },

  getCreator: async (parent, args, context) => {
    const { myId, userId } = args.input;

    console.log(args.input, context.authorization);
    if (!myId && !userId) return null;

    return isAuth(
      () => {
        try {
          const creator = prisma.creator.findUnique({
            where: {
              userId: userId,
            },
            select: {
              id: true,
              request: {
                orderBy: {
                  createdAt: "desc",
                },
              },
              plans: {
                select: {
                  id: true,
                  title: true,

                  visibility: true,
                  updateAt: true,
                  digitalProduct: {
                    select: {
                      id: true,
                      amount: true,
                    },
                  },
                },
              },
              paidMessages: {
                select: {
                  id: true,
                  visibility: true,
                  digitalProduct: {
                    select: {
                      id: true,
                      amount: true,
                    },
                  },
                },
              },
            },
          });

          return creator;
        } catch (e) {
          console.log(e);
        }
      },
      () => console.error("NOT AUTHORIZATED"),
      context,
      myId,
      true
    );
  },
  getPlansCreators: async (parent, args, context) => {
    const { myId, userId } = args.input;
    if (!myId || !userId || !context.authorization) return null;

    return isAuth(
      async () => {
        try {
          const plans = await prisma.plan.findMany({
            where: {
              creator: {
                userId: userId,
              },
            },
            select: {
              id: true,
              title: true,
            },
          });

          return plans;
        } catch (e) {
          console.log(e);
        }
      },
      () => console.error("NOT AUTHORIZATED"),
      context,
      myId,
      true
    );
  },
  /*
  getRequestCreators: async (parent, args, context) => {
    console.log("get request creators", context, args);
    return isAuth(
      () => {
        const creators = prisma.creator.findMany({
          orderBy: {
            requestDate: "asc",
          },
          where: {
            status: "pending",
          },
          select: {
            id: true,
            status: true,
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
                birthday: true,
              },
            },
            country: true,
            requestDate: true,
            city: true,
            address: true,
            zipCode: true,
            dniFront: true,
            dniBack: true,
          },
        });
        return creators;
      },
      () => console.error("NOT AUTHORIZATED"),
      context,
      args.userId,
      true,
      "admin"
    );
  },
  */
};
