const { usePrisma } = require("../prisma");
const prisma = usePrisma;
const isAuth = require("../isAuth");

module.exports = {
  getWallets: async (parent, args, context) => {
    try {
      return await prisma.wallet.findMany({
        include: {
          movements: {
            include: {
              sales: true,
            },
          },
          revenue: true,
        },
      });
    } catch (error) {
      console.log(error);
    }
  },
  getWalletById: async (parent, args, context) => {
    try {
      return await isAuth(
        async (user) => {
          const wallet = await prisma.wallet.findFirst({
            where: {
              customer: {
                userId: args.input.userId,
              },
            },
          });

          return wallet;
        },
        (error) => {
          console.log(error);
        },
        context,
        args.userId
      );
    } catch (error) {
      console.log(error);
    }
  },
};
