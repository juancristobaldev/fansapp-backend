const { PrismaClient } = require("@prisma/client");
const isAuth = require("../../isAuth");

const prisma = new PrismaClient();

module.exports = {
  userSignIn: async (parent, args, context) => {
    const { email, password } = args.input;
    if (!email || !password) {
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
        select: {
          id: true,
          rol: true,
          firstName: true,
          lastName: true,
          email: true,
          birthday: true,
          gender: true,
          password: true,
          createdAt: true,
          token: true,
          profile: {
            select: {
              id: true,
              description: true,
              photo: true,
              frontPage: true,
            },
          },
        },
      });

      console.log(user);

      if (user) {
        return {
          errors: false,
          success: true,
          user: user,
        };
      } else {
        return {
          errors: `Email y/o contraseña incorrectos.`,
          success: false,
        };
      }
    } catch (err) {
      return {
        errors: `${err}`,
        success: false,
      };
    }
  },
  updateRequest: (parent, args, context) => {
    const { userId, requestId, status } = args.input;
    console.log(args.input);
    if (!userId || !requestId || !context.authorization || !status) return [];

    return isAuth(
      async () => {
        try {
          const request = await prisma.requestCreator.update({
            data: {
              status: status,
            },
            where: {
              id: requestId,
            },
            select: {
              id: true,
              status: true,
              creatorId: true,
              creator: {
                select: {
                  userId: true,
                  paidMessages: {
                    select: {
                      id: true,
                    },
                  },
                  _count: {
                    select: {
                      plans: true,
                    },
                  },
                },
              },
            },
          });

          let requestData = {
            ...request,
          };

          const user = await prisma.user.update({
            where: {
              id: request.creator.userId,
            },
            data: {
              rol: status === "approved" ? "creator" : "customer",
            },
          });

          const creator = await prisma.creator.update({
            data: {
              approbedDate:
                status === "approved" ? new Date().toISOString() : null,
            },
            where: {
              id: request.creatorId,
            },
          });

          console.log(request);

          if (!request.creator.paidMessages) {
            await prisma.paidMessage
              .create({
                data: {
                  visibility: false,
                  digitalProduct: {
                    create: {
                      amount: null,
                      creatorId: request.creatorId,
                    },
                  },
                  creator: {
                    connect: {
                      id: request.creatorId,
                    },
                  },
                },
              })
              .then((data) => {
                if (data) {
                  console.log("creado con exito:", data);
                }
              })
              .catch((err) => {
                console.log(err);
              });
          }

          if (request.creator._count.plans === 0) {
            await prisma.plan
              .create({
                data: {
                  title: "Plan general",
                  visibility: false,
                  digitalProduct: {
                    create: {
                      amount: null,
                      creatorId: request.creatorId,
                    },
                  },
                  creator: {
                    connect: {
                      id: request.creatorId,
                    },
                  },
                },
              })
              .catch((err) => {
                console.log(err);
              })
              .then((data) => {
                if (data) {
                  console.log("creado con exito:", data);
                }
              });
          }

          requestData.creator = { ...creator, user: user };

          return [requestData];
        } catch (e) {
          return {
            success: false,
            errors: e,
          };
        }
      },
      () => {
        console.log("NOT AUTHORIZATED");
        return;
      },
      context,
      args.input.userId,
      true,
      "admin"
    );
  },
};
