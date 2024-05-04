// userRoutes.js
const express = require("express");
const flowRoutes = express.Router();
const FlowApi = require("flowcl-node-api-client");

const { PrismaClient } = require("@prisma/client");
const { getExchangesRates } = require("../flow/exchange");

const prisma = new PrismaClient();

const flowApi = new FlowApi({
  apiKey: process.env.API_KEY_FLOW,
  secretKey: process.env.SECRET_KEY_FLOW,
  apiURL: process.env.API_URL_SANDBOX_FLOW,
});

// Define tus rutas para usuarios
flowRoutes.post("/payment/create", async (req, res) => {
  let params = { ...req.body };

  console.log(params);

  const ratesExchanges = await getExchangesRates();

  params.amount = parseInt(ratesExchanges["CLP"] * params.amount);

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
  res.redirect("http://localhost:3000/");
});

flowRoutes.post("/payment/result", async (req, res) => {
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

  if (response.status === 3) {
    res.redirect("https://www.google.cl");
  } else if (response.status === 2) {
    const commerceOrder = response.commerceOrder;

    const sale = await prisma.sales.findUnique({
      where: {
        id: commerceOrder,
      },
      include: {
        digitalProduct: true,
      },
    });

    console.log(sale);
  }

  res.send(response);
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
