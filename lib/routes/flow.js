// userRoutes.js

const { addMovement } = require("../walletFunctions");
const express = require("express");
const flowRoutes = express.Router();
const FlowApi = require("flowcl-node-api-client");

const { PrismaClient } = require("@prisma/client");
const { getExchangesRates, convertCLPtoUSD } = require("../flow/exchange");
const moment = require("moment");

const prisma = new PrismaClient();

const flowApi = new FlowApi({
  apiKey: process.env.API_KEY_FLOW,
  secretKey: process.env.SECRET_KEY_FLOW,
  apiURL: process.env.API_URL_SANDBOX_FLOW,
});

const { emitNotifications } = require("../pusher");

flowRoutes.post("/payment/create", async (req, res) => {
  let params = { ...req.body };

  const serviceName = "payment/create";

  let response = await flowApi.send(serviceName, params, "POST");

  redirect = response.url + "?token=" + response.token;

  console.log(redirect);

  res.json({
    redirect,
  });
});

// --- Suscripcion

flowRoutes.post("/suscription/create", async (req, res) => {
  const params = req.body;

  console.log(params);

  try {
    const serviceName = "subscription/create";

    const response = await flowApi.send(serviceName, params, "POST");

    res.send(JSON.stringify(response));
  } catch (error) {
    console.log(error);
  }
});

flowRoutes.post("/return", async (req, res) => {
  console.log("return", req.body);

  const getStatusPayment = async () => {
    try {
      let params = {
        token: req.body.token,
      };

      let serviceName = "payment/getStatus";

      let response = await flowApi
        .send(serviceName, params, "GET")
        .catch((error) => {
          console.log(error);
        });
      //Actualiza los datos en su sistema

      console.log("RESPONSE -> RETURN");

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  };

  const statusPayment = await getStatusPayment();

  const sale = await prisma.sales.findFirst({
    where: {
      id: statusPayment.commerceOrder,
    },
    include: {
      digitalProduct: {
        select: {
          post: {
            select: {
              id: true,
            },
          },
          paidMessages: true,
          plan: {
            select: {
              creator: {
                select: {
                  user: {
                    select: {
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (sale) {
    const digitalProduct = sale.digitalProduct;

    if (digitalProduct.plan) {
      return res.redirect(
        `https:/localhost:3000/${digitalProduct.plan.creator.user.username}`
      );
    } else if (digitalProduct.post) {
      return res.redirect(
        `https://localhost:3000/post/${digitalProduct.post.id}`
      );
    } else if (digitalProduct.paidMessages) {
      console.log("IS paidMessages");
    }

    res.redirect("https://localhost:3000/");
  }
});

flowRoutes.post("/recharge/result", async (req, res, next) => {
  const getStatusPayment = async () => {
    try {
      let params = {
        token: req.body.token,
      };

      let serviceName = "payment/getStatus";

      let response = await flowApi
        .send(serviceName, params, "GET")
        .catch((error) => {
          console.log(error);
        });
      //Actualiza los datos en su sistema

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  };

  const response = await getStatusPayment();

  if (response.status === 3) {
    console.log("cancelado");
  } else if (response.status === 2) {
    const commerceOrder = response.commerceOrder;

    const sale = await prisma.sales.findUnique({
      where: {
        id: commerceOrder,
      },
    });
  }
});

flowRoutes.post("/payment/result", async (req, res, next) => {
  console.log("RESULT, req.body");

  const getStatusPayment = async () => {
    try {
      let params = {
        token: req.body.token,
      };

      let serviceName = "payment/getStatus";

      let response = await flowApi
        .send(serviceName, params, "GET")
        .catch((error) => {
          console.log(error);
        });
      //Actualiza los datos en su sistema

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  };

  const response = await getStatusPayment();

  if (response.status === 3) {
    return res.send(response);
  } else if (response.status === 2) {
    const commerceOrder = response.commerceOrder;

    const sale = await prisma.sales.findUnique({
      where: {
        id: commerceOrder,
      },
      include: {
        customer: true,
        digitalProduct: {
          include: {
            creator: {
              select: {
                id: true,
                userId: true,
              },
            },
            post: true,
            paidMessages: true,
            plan: true,
          },
        },
      },
    });

    const digitalProduct = sale.digitalProduct;

    console.log(response.paymentData.balance, response.paymentData.amount);

    let amount = await convertCLPtoUSD(parseInt(response.paymentData.balance));

    console.log("AMOUNT to usd->", amount);

    amount = amount - 0.05 * amount;

    console.log("AMOUNT without 5%->", amount);

    console.log("SALE ->", sale);

    const customer = await prisma.customer.findFirst({
      where: {
        user: {
          creator: {
            id: digitalProduct.creator.id,
          },
        },
      },
    });

    console.log("CUSTOMER ->", customer);

    const walletReceiver = await prisma.wallet.findFirst({
      where: {
        customer: {
          user: {
            creator: {
              id: {
                equals: digitalProduct.creator.id,
              },
            },
          },
        },
      },
      include: {
        customer: {
          select: {
            user: {
              select: {
                notifications: true,
              },
            },
          },
        },
      },
    });

    console.log("DIGITAL_PRODUCT_PLAM _>", digitalProduct);

    const movement = await addMovement(
      sale.customer.id,
      "loss",
      amount,
      walletReceiver.id,
      true
    );

    if (digitalProduct.post) {
      if (walletReceiver.customer.user.notifications.purchases) {
        emitNotifications(
          digitalProduct.creator.userId,
          "Ha comprado una publicacion",
          sale.digitalProduct.post,
          "purchases",
          sale.customer.userId
        );
      }
    }

    if (digitalProduct.plan) {
      if (walletReceiver.customer.user.notifications.suscriptors) {
        emitNotifications(
          digitalProduct.creator.userId,
          "Se ha suscrito a tu plan",
          sale.digitalProduct.plan,
          "suscriptors",
          sale.customer.userId
        );
      }

      const fechaHoraActual = new Date();
      const deadDate = new Date(fechaHoraActual);
      deadDate.setMonth(deadDate.getMonth() + 1);

      console.log(
        "sale.customer.userId",
        sale.customer.userId,
        "digitalProduct.creator.id",
        digitalProduct.creator.id,
        "digitalProduct.plan.id",
        digitalProduct.plan.id
      );

      const findSuscription = await prisma.suscriptions.findFirst({
        where: {
          userId: sale.customer.userId,
          creatorId: digitalProduct.creator.id,
          plansId: digitalProduct.plan.id,
        },
      });

      if (findSuscription) {
        await prisma.suscriptions
          .update({
            data: {
              status: 1,
              deadDate,
              price: parseInt(response.paymentData.amount),
            },
            where: {
              id: findSuscription.id,
            },
          })
          .catch((error) => console.log(error));
      } else {
        await prisma.suscriptions
          .create({
            data: {
              status: 1,
              plansId: digitalProduct.plan.id,
              deadDate,
              creatorId: digitalProduct.creator.id,
              price: parseInt(response.paymentData.amount),
              userId: sale.customer.userId,
            },
          })
          .catch((error) => console.log(error));
      }
    }

    const paymentDate = moment(response.paymentData.date).toISOString();
    const transferDate = moment(
      response.paymentData.transferDate
    ).toISOString();

    console.log(" movement.id", movement);

    const updatedSale = await prisma.sales
      .update({
        where: {
          id: sale.id,
        },
        data: {
          transferDate,
          paymentMethod: response.paymentData.media,
          paymentDate,
          status: response.status,
          movements: {
            connect: {
              id: movement.id,
            },
          },
        },
      })
      .catch((error) => console.error(error));

    req.digitalProduct = { ...updatedSale, digitalProduct };

    return res.send({ ...updatedSale, digitalProduct });
  }

  return res.send(response);
});

// ----  CUSTOMERS

flowRoutes.post("/customer/create", async (req, res) => {
  console.log(req.body);

  try {
    let serviceName = "customer/create";

    let response = await flowApi.send(serviceName, req.body, "POST");

    console.log(response);

    if (response.status == "1") {
      console.log(response);

      const customer = await prisma.customer
        .create({
          data: {
            customerId: response.customerId,
            userId: parseInt(response.externalId),
          },
        })

        .catch((error) => console.log(error));

      res.json(customer);
    }
  } catch (error) {
    console.log(error);
  }
});

flowRoutes.post("/customer/register", async (req, res) => {
  const serviceName = req.path.slice(1, req.path.length);
  try {
    let response = await flowApi.send(serviceName, req.body, "POST");

    res.send(response);
  } catch (error) {
    console.log(error);
  }
});

// ---- PLANS

flowRoutes.post("/plans/get", async (req, res) => {
  let serviceName = "plans/get";

  let response = await flowApi.send(serviceName, req.body, "GET");

  console.log(response);
});

flowRoutes.post("/plans/create", async (req, res) => {
  let serviceName = "plans/create";

  let response = await flowApi.send(serviceName, req.body, "POST");
});

// Exporta el router para ser utilizado en otro lugar
module.exports = flowRoutes;
