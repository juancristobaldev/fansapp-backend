const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();
const moment = require("moment");

module.exports = {
  createSuscription: async (parent, args, context) => {
    const { price, userId, creatorId, planId: plansId } = args.input;
    let errors = [];

    const response = await isAuth(
      async (user) => {
        const plan = await prisma.plans.findUnique({
          where: {
            id: plansId,
          },
        });

        if (plan) {
          if (plan.amount == 0) {
            let nextMonthDate = moment().add(1, "months");
            let formattedDate = nextMonthDate.toISOString();

            const similarData = {
              price: plan.amount,
              status: 1,
              deadDate: formattedDate,
            };

            const suscription = await prisma.suscriptions.findFirst({
              where: {
                creatorId: creatorId,
                plansId: plansId,
                userId: userId,
              },
            });

            let newSuscription = false;

            if (suscription) {
              newSuscription = await prisma.suscriptions
                .update({
                  where: {
                    id: suscription.id,
                  },
                  data: similarData,
                })
                .catch((error) => errors.push(error));
            } else
              newSuscription = await prisma.suscriptions
                .create({
                  data: {
                    ...similarData,
                    creatorId,
                    userId,
                    plansId,
                  },
                })
                .catch((error) => errors.push(error));

            if (errors.length)
              return {
                errors: JSON.stringify(errors),
                success: false,
              };

            if (newSuscription) {
              const suscriptions = user.suscriptions.filter(
                (suscription) => suscription.id !== newSuscription.id
              );

              return {
                user: {
                  ...user,
                  suscriptions: [...suscriptions, newSuscription],
                },
                errors: JSON.stringify(errors),
                success: true,
              };
            }
          }
        }

        return {
          errors: ["Error"],
          success: false,
        };
      },
      (error) => ({
        errors: error,
        success: false,
      }),
      context,
      args.input.userId,
      {
        suscriptions: true,
      }
    );

    return response;
  },
  updateSuscription: async (parent, args, context) => {
    const newArgs = { ...args.input };
    delete newArgs.id;
    delete newArgs.userId;

    const response = await isAuth(
      async (user) => {
        const errors = [];

        const suscription = await prisma.suscriptions
          .update({
            where: {
              id: args.input.id,
            },
            data: {
              ...newArgs,
            },
          })
          .catch((error) => errors.push(error));

        if (errors.length)
          return {
            errors: JSON.stringify(errors),
            success: false,
          };

        return {
          success: true,
          suscription: suscription,
        };
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
  deleteSuscription: async (parent, args, context) => {
    console.log(args);

    if (args.suscriptionId) {
      error = false;
      await prisma.suscriptions
        .delete({
          where: {
            id: args.suscriptionId,
          },
        })
        .catch((errorPrisma) => (error = errorPrisma));

      if (error)
        return {
          errors: error,
          success: false,
        };
      else
        return {
          success: true,
          errors: false,
        };
    }
  },
  cancelSuscription: async (parent, args, context) => {
    const { creatorId, userId, id } = args.input;

    console.log(args.input);
    const response = await isAuth(
      async () => {
        let error;
        if (!creatorId && id && !userId)
          return {
            errors: "CREATOR ID AND USER ID REQUIRED",
            success: false,
          };

        const user = await prisma.suscriptions
          .update({
            where: {
              id: id,
              creatorId,
              userId,
            },
            data: {
              status: 0,
            },
            include: {
              user: {
                include: {
                  suscriptions: true,
                },
              },
            },
          })
          .catch((errorPrimsa) => {
            console.log(errorPrimsa);
            return (error = errorPrimsa);
          });

        console.log(user.user);

        if (error)
          return {
            errors: error,
            success: false,
          };
        else
          return {
            success: true,
            errors: false,
            user: user.user,
          };
      },
      (error) => ({
        errors: error,
        success: false,
      }),
      context,
      args.input.userId
    );
    console.log(response);
    return response;
  },
};
