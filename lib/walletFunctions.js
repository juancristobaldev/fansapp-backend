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
            id: customerId,
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
                id: wallet.id,
              },
              data: {
                amount: amountWallet,
                movements: {
                  create: {
                    amount: amount,
                    type: type,
                    receiverWalletId: walletId || null,
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