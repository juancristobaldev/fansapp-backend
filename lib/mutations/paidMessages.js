const isAuth = require("../isAuth");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;

module.exports = {
  updatePaidMessages: async (parent, args, context) => {
    const { id, userId, creatorId, amount, visibility } = args.input;

    if (!id || !userId || !creatorId)
      return {
        errors: JSON.stringify([
          "id paidmessage || userId || creatorId required",
        ]),
        success: false,
      };

    if (amount == null && visibility == null)
      return {
        errors: JSON.stringify(["amount OR visibility required"]),
        success: false,
      };

    const response = await isAuth(
      async (user) => {
        const errors = [];
        const newData = { ...args.input };
        delete newData.userId;
        delete newData.id;
        delete newData.creatorId;

        const paidMessage = await prisma.paidMessages
          .update({
            where: {
              id,
              creatorId,
            },
            data: newData,
          })
          .catch((error) => errors.push(error));

        if (errors.length)
          return {
            errors: JSON.stringify(errors),
            success: false,
          };

        if (paidMessage)
          return {
            errors: false,
            success: true,
            user: {
              ...user,
              creator: { ...user.creator, paidMessages: paidMessage },
            },
          };
      },
      (error) => ({
        errors: JSON.stringify([error]),
        success: false,
      }),
      context,
      args.input.userId,
      {
        creator: true,
      }
    );

    return response;
  },
};
