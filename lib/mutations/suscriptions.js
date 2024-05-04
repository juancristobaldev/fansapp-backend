const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const prisma = new PrismaClient();

module.exports = {
  createSuscription: async (parent, args, context) => {
    const { price, userId, creatorId } = args.input;
    let error = false;

    const response = await isAuth(
      async (user) => {
        if (price == 0) {
          const suscription = await prisma.suscriptions
            .create({
              data: {
                userId: user.id,
                creatorId,
                price,
              },
            })
            .catch((errorPrisma) => (error = errorPrisma));

          if (error)
            return {
              errors: error,
              success: false,
            };

          if (suscription) console.log(suscription);
          return {
            suscription,
            errors: "",
            success: true,
          };
        }
      },
      (error) => ({
        errors: error,
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
