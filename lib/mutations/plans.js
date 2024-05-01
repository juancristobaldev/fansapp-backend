const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();
const FlowApi = require("flowcl-node-api-client");

module.exports = {
  updatePlan: async (parent, args, context) => {
    const {
      userId,
      amount,
      discount,
      visibility,
      id,
      creatorId,
      yearlyVisibility,
    } = args.input;

    console.log(args.input);

    const response = await isAuth(
      async (user) => {
        console.log(user);
        if (!id)
          return {
            errors: "id plan required",
            success: false,
          };
        if (
          amount == null &&
          discount == null &&
          visibility == null &&
          yearlyVisibility == null
        )
          return {
            errors: "amount or discount or visibility plan required",
            success: false,
          };

        let data = {
          ...args.input,
        };

        delete data.userId;
        delete data.id;
        delete data.creatorId;

        let errors = [];

        const creator = await prisma.creator.findFirst({
          where: {
            userId: user.id,
          },
        });

        console.log(creator);

        if (creator.status !== "creator") {
          console.log(creator.status);
          await prisma.creator.update({
            where: {
              userId: user.id,
            },
            data: {
              status: "creator",
            },
          });
        }

        let monthlyPlan = {};
        let yearlyPlan = {};
        if (amount > 0) {
          monthlyPlan.amount = amount;
          yearlyPlan.amount = amount * 12 * 0.8;

          monthlyPlan.amountWithDiscount = null;
          yearlyPlan.amountWithDiscount = null;

          if (discount > 0) {
            const monthlyDiscountRate =
              discount >= 10 ? 0.01 * discount : 0.001 * discount;
            const totalAmountDiscountMonthly =
              monthlyPlan.amount * monthlyDiscountRate;
            const amountMonthlyWithDiscount =
              monthlyPlan.amount - totalAmountDiscountMonthly;

            // Calcula el descuento anual
            const yearlyDiscountRate =
              discount >= 10 ? 0.01 * discount : 0.001 * discount;
            const totalAmountDiscountYearly =
              yearlyPlan.amount * yearlyDiscountRate;

            yearlyPlan.amountWithDiscount =
              yearlyPlan.amount - totalAmountDiscountYearly;
            monthlyPlan.amountWithDiscount = amountMonthlyWithDiscount;
          }
        }

        if (monthlyPlan.amount || monthlyPlan.discount) {
          data = {
            ...data,
            amount: monthlyPlan.amount,
            yearlyAmount: yearlyPlan.amount,
            monthlyAmountWithDiscount: monthlyPlan.amountWithDiscount,
            yearlyAmountWithDiscount: yearlyPlan.amountWithDiscount,
          };
        }

        const plan = await prisma.plans
          .update({
            data: data,
            where: {
              id: id,
            },
          })
          .catch((err) => errors.push(err));

        if (!errors.length)
          return {
            plan,
            errors: false,
            success: true,
          };
        else
          return {
            errors: JSON.stringify(errors),
            success: false,
          };
      },
      (err) => ({ errors: err, success: false }),
      context,
      userId
    );

    return response;
  },
};
