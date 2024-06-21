const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  addMovement: async (customerId, type, amount, walletId, webPay = false) => {
    console.log(customerId, type, amount, walletId);
    if (!amount || !type || !customerId) return false;

    return await prisma.wallet
      .findFirst({
        where: {
          customer: {
            id: walletId,
          },
        },
      })
      .then(async (wallet) => {
        try {
          if (wallet) {
            let amountWallet = wallet.amount;

            amountWallet = amountWallet + amount;

            const newWalletCreator = await prisma.wallet.update({
              where: {
                id: walletId,
              },
              data: {
                amount: amountWallet,
              },
            });

            if (!webPay) {
              const walletCustomer = await prisma.wallet.findFirst({
                where: {
                  customer: {
                    id: customerId,
                  },
                },
              });

              let amountCustomer = walletCustomer.amount - amount;

              await prisma.wallet.update({
                where: {
                  id: walletCustomer.id,
                },
                data: {
                  amount: amountCustomer,
                },
              });
            }

            await prisma.movements.create({
              data: {
                amount: amount,
                type: type,
                receiverWallet: {
                  connect: {
                    id: walletId,
                  },
                },
                wallet: {
                  connect: {
                    customerId: customerId,
                  },
                },
              },
            });

            console.log("newWallet ____>", newWalletCreator);
          }
        } catch (error) {
          console.log(error);
        }
      });
  },
};
