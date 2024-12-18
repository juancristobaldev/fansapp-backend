const isAuth = require("../isAuth");
const { usePrisma } = require("../prisma");
const prisma = usePrisma;

module.exports = {
  getSales: async (parent, args, context) => {
    console.log("query");
    const sales = await prisma.sales.findMany({
      include: {
        customer: true,
      },
    });

    let total = 0;

    for (const sale of sales) {
      if (sale.status == 2) {
        total = total + sale.amount;
      }
    }

    console.log("TOTAL GANANCIAS -> ", 0.05 * total);

    console.log("TOTAL VENTAS ->", total);

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
