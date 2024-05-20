const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");
const getDatetime = require("../getDate");

const prisma = new PrismaClient();

module.exports = {
  getSales: async (parent, args, context) => {
    console.log("query");
    const sales = await prisma.sales.findMany({
      include: {
        customer: true,
      },
    });

    console.log(sales);

    return sales;
  },
  getSalesByCustomerId: async (parent, args, context) => {
    const response = isAuth(
      (user) => {
        console.log(user);
      },
      (error) => ({
        errors: JSON.stringify([error]),
        success: false,
      }),
      context,
      args.userId
    );

    return response;
  },
};
