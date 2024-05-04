const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();
const FlowApi = require("flowcl-node-api-client");

module.exports = {
  createSale: async (parent, args, context) => {
    console.log(context);
    const response = await isAuth(
      async (user) => {
        const data = { ...args.input };
        delete data.userId;
        let errors = [];

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
};
