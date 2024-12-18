const { usePrisma } = require("./prisma");

const prisma = usePrisma;

module.exports = {
  addMovement: async (customerId, type, amount, walletId, webPay = false) => {
    if (!amount || !type || !customerId) return;
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

              console.log("newAmountCustomer", amountCustomer);

              await prisma.wallet.update({
                where: {
                  id: walletCustomer.id,
                },
                data: {
                  amount: amountCustomer,
                },
              });
            }

            const movement = await prisma.movements.create({
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
            return movement;
          }
        } catch (error) {
          console.log(error);
        }
      });
  },
};
