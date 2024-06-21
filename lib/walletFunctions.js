const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  addMovement: async (userId, type, amount, walletId) => {
    console.log(userId, type, amount, walletId);
    if (!amount || !type || !userId) return false;

    return await prisma.wallet
      .findFirst({
        where: {
          customer: {
            id: userId,
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
