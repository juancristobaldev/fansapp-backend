const { PrismaClient } = require("@prisma/client");
const isAuth = require("../isAuth");

const prisma = new PrismaClient();
const FlowApi = require("flowcl-node-api-client");
const { getPlan, createPlan, editPlan } = require("../flow/plans");
const { getExchangesRates } = require("../flow/exchange");

module.exports = {
  createPlan: async (parent, args, context) => {
    const { userId, creatorId, amount, title, posts, albums } = args.input;

    console.log(args.input);

    if (!userId || !creatorId || !creatorId || context.authorization)
      return {
        errors: "no authorized",
        success: false,
      };

    const response = await isAuth(
      async (user) => {
        try {
          const plan = await prisma.plan.create({
            data: {
              creatorId,
              title: title || "Plan personalizado",
              digitalProduct: {
                create: {
                  amount: amount || 0,
                  creatorId: creatorId,
                },
              },
              postsOfPlans: {
                createMany: {
                  data: [...posts],
                },
              },
              albumsOfPlans: {
                createMany: {
                  data: [...albums],
                },
              },
            },
            include: {
              visibility: true,
              id: true,
              creatorId: true,
              createdAt: true,
              creator: true,
              digitalProduct: true,
            },
          });

          const data = {
            id: plan.creator.userId,
            creator: {
              id: plan.creatorId,
              plans: [plan],
            },
          };

          delete data.creator.plans[0].creator;

          return {
            success: true,
            errors: false,
            user: data,
          };
        } catch (e) {
          console.log(e);
        }
      },
      (err) => ({ errors: err, success: false }),
      context,
      userId,
      true,
      "creator"
    );

    return response;
  },
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
            userId: userId,
          },
        });

        console.log(creator);

        if (creator.status !== "creator") {
          console.log(creator.status);
          await prisma.creator.update({
            where: {
              userId: userId,
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
          yearlyPlan.amount = parseFloat(amount * 12 * 0.8);

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
              amount * 12 * 0.8 - totalAmountDiscountYearly;
            monthlyPlan.amountWithDiscount = amountMonthlyWithDiscount;
          }
        }

        if (monthlyPlan.amount || monthlyPlan.discount) {
          data = {
            ...data,
            amount: monthlyPlan.amount,
            yearlyAmount: yearlyPlan.amount,
            monthlyAmountWithDiscount: parseFloat(
              monthlyPlan.amountWithDiscount
            ),
            yearlyAmountWithDiscount: parseFloat(yearlyPlan.amountWithDiscount),
          };
        }

        const responsePlanMonthly = await getPlan({
          planId: `monthly-plan${id}-${user.id}`,
        });
        const responsePlanYearly = await getPlan({
          planId: `yearly-plan${id}-${user.id}`,
        });

        console.log("respone ->", responsePlanMonthly);

        const conversionsToday = await getExchangesRates();

        if (conversionsToday) {
          console.log("conversions...");

          let yearlyTotal =
            parseFloat(yearlyPlan.amount) * conversionsToday["CLP"];

          let monthlyTotal =
            parseFloat(monthlyPlan.amount) * conversionsToday["CLP"];

          if (discount > 0) {
            yearlyTotal =
              parseFloat(yearlyPlan.amountWithDiscount) *
              conversionsToday["CLP"];
            monthlyTotal =
              parseFloat(monthlyPlan.amountWithDiscount) *
              conversionsToday["CLP"];
          }

          if (
            responsePlanMonthly == undefined &&
            responsePlanYearly == undefined
          ) {
            await createPlan({
              planId: `monthly-plan${id}-${user.id}`,
              name: `Suscripcion mensual a @${user.username}`,
              amount: monthlyTotal,
              interval: 3,
            });

            await createPlan({
              planId: `yearly-plan${id}-${user.id}`,
              name: `Suscripcion anual a @${user.username}`,
              amount: yearlyTotal,
              interval: 4,
            });
            console.log("create-successful");
          } else {
            await editPlan({
              planId: `monthly-plan${id}-${user.id}`,
              amount: monthlyTotal,
            });
            await editPlan({
              planId: `yearly-plan${id}-${user.id}`,
              amount: yearlyTotal,
            });
            console.log("edit-successful");
          }
        }

        console.log("NEW DATA ->", data, "PLAN-ID --->", id);

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
