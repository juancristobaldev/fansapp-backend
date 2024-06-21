const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();
const FlowApi = require("flowcl-node-api-client");

module.exports = {
  deleteSales: async (parent, args, context) => {
    try {
      await prisma.sales.deleteMany();

      return {
        success: true,
        errors: false,
      };
    } catch (error) {
      return {
        success: false,
        errors: error,
      };
    }
  },
  createSale: async (parent, args, context) => {
    console.log(context);
    const response = await isAuth(
      async (user) => {
        const data = { ...args.input };
        delete data.userId;
        let errors = [];

        console.log(args);

        const sale = await prisma.sales
          .create({
            data: {
              ...data,
              status: 1,
            },
          })
          .catch((error) => errors.push(error));

        if (errors.length) {
          return {
            errors: JSON.stringify(errors),
            success: false,
          };
        } else {
          return {
            success: true,
            errors: false,
            sale: sale,
          };
        }
      },
      (error) => ({
        errors: JSON.stringify([error]),
      }),
      context,
      args.input.userId
    );

    return response;
  },
  deleteAllMovements: async () => {
    try {
      await prisma.movements.deleteMany();

      return {
        success: true,
        errors: false,
      };
    } catch (error) {
      return {
        errors: `${error}`,
        success: false,
      };
    }
  },
  resetWallets: async () => {
    try {
      const wallets = await prisma.wallet.findMany();
      for (const wallet of wallets) {
        try {
          await prisma.wallet.update({
            data: {
              amount: 0,
            },
            where: {
              id: wallet.id,
            },
          });
        } catch (error) {
          throw error;
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `${error}`,
      };
    }
  },
};
