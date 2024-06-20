// userRoutes.js
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
const { initializeSocketIo, getIo } = require("../../lib/socket");
// Define tus rutas para usuarios
flowRoutes.post("/payment/create", async (req, res) => {
  let params = { ...req.body };

  console.log(params);

  const serviceName = "payment/create";

  console.log(params);

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
  console.log("return");

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
        `https://peachshub.vercel.app/${digitalProduct.plan.creator.user.username}`
      );
    } else if (digitalProduct.post) {
      return res.redirect(
        `https://peachshub.vercel.app/post/${digitalProduct.post.id}`
      );
    } else if (digitalProduct.paidMessages) {
      console.log("IS paidMessages");
    }

    res.redirect("/");
  }
});

flowRoutes.post("/payment/result", async (req, res, next) => {
  console.log("RESULT");

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
  console.log(response);
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

    await prisma.wallet
      .findFirst({
        where: {
          customer: {
            userId: digitalProduct.creator.userId,
          },
        },
      })
      .then(async (wallet) => {
        try {
          if (wallet) {
            let amount;
            if (digitalProduct.paidMessages)
              amount = digitalProduct.paidMessages.amount;
            if (digitalProduct.post) amount = digitalProduct.post.amount;
            if (digitalProduct.plan) amount = digitalProduct.plan.amount;

            if (amount) {
              amount = amount - amount * (5 / 100);

              await prisma.wallet.update({
                where: {
                  id: wallet.id,
                },
                data: {
                  amount: wallet.amount + amount,
                  movements: {
                    create: {
                      amount: amount,
                      type: "revenue",
                    },
                  },
                },
              });
            }
          }
        } catch (error) {
          console.log(error);
        }
      });

    if (digitalProduct.plan) {
      const fechaHoraActual = new Date();

      // Obtener la fecha y hora del mes siguiente
      const deadDate = new Date(fechaHoraActual);
      deadDate.setMonth(deadDate.getMonth() + 1);

      const suscription = await prisma.suscriptions.findFirst({
        where: {
          userId: sale.customer.userId,
          creatorId: digitalProduct.creatorId,
          plansId: digitalProduct.plan.id,
        },
      });

      if (suscription) where.id = suscription.id;

      await prisma.suscriptions
        .upsert({
          create: {
            status: 1,
            plansId: digitalProduct.plan.id,
            deadDate,
            creatorId: digitalProduct.creatorId,
            price: parseInt(response.paymentData.amount),
            userId: sale.customer.userId,
          },
          where: where,
          update: {
            status: 1,
            deadDate,
            price: parseInt(response.paymentData.amount),
          },
        })
        .then((data) => {
          console.log("suscription->", data);
          return data;
        })
        .catch((error) => console.error(error));
    } else if (digitalProduct.paidMessages) {
    }

    const paymentDate = moment(response.paymentData.date).toISOString();
    const transferDate = moment(
      response.paymentData.transferDate
    ).toISOString();

    const updatedSale = await prisma.sales
      .update({
        where: {
          id: sale.id,
        },
        data: {
          amount: response.paymentData.balance,
          transferDate,
          paymentMethod: response.paymentData.media,
          paymentDate,
          status: response.status,
        },
      })
      .catch((error) => console.error(error));

    /*
    
    
    const io = getIo();

    io.emit("purchaseSuccess", updatedSale);

    */

    req.digitalProduct = { ...updatedSale, digitalProduct };

    return res.send({ ...updatedSale, digitalProduct });
  }

  /*
  
   if(sale){
      const updatedSale = await prisma.sales.update({
        where:{
          id:sale.id
        },
        data:{
          amount:response.paymentData.balance,
          transferDate: response.paymentData.balance,
          paymentMethod:response.paymentData.media,
          paymentDate:response.paymentData.date,
          status: 
        }
      })
    }

  */

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
  console.log(req.body);

  let serviceName = "plans/get";

  let response = await flowApi.send(serviceName, req.body, "GET");

  console.log(response);
});

flowRoutes.post("/plans/create", async (req, res) => {
  console.log(req.body);

  let serviceName = "plans/create";

  let response = await flowApi.send(serviceName, req.body, "POST");
});

// Exporta el router para ser utilizado en otro lugar
module.exports = flowRoutes;
