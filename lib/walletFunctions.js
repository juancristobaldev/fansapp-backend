const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  addMovement: async (customerId, type, amount, walletId) => {
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

            if (type === "revenue") amountWallet = amountWallet + amount;
            else if (type === "loss") amountWallet = wallet.amount - amount;

            const newWallet = await prisma.wallet.update({
              where: {
                id: walletId,
              },
              data: {
                amount: amountWallet,
              },
            });

            await prisma.movements.create({
              data: {
                amount: amount,
                type: "revenue",
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

            console.log("newWallet ____>", newWallet);
          }
        } catch (error) {
          console.log(error);
        }
      });
  },
};
