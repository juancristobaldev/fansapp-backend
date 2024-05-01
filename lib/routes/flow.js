// userRoutes.js
const express = require("express");
const flowRoutes = express.Router();
const FlowApi = require("flowcl-node-api-client");

// Define tus rutas para usuarios
flowRoutes.post("/create_order", async (req, res) => {
  const params = req.body;

  const serviceName = "payment/create";

  const flowApi = new FlowApi({
    apiKey: process.env.API_KEY_FLOW,
    secretKey: process.env.SECRET_KEY_FLOW,
    apiURL: process.env.API_URL_SANDBOX_FLOW,
  });

  let response = await flowApi.send(serviceName, params, "POST");

  redirect = response.url + "?token=" + response.token;

  console.log(redirect);

  res.json({
    redirect,
  });
});

flowRoutes.post("/create_suscription", async (req, res) => {
  const params = req.body;

  console.log(params);
});

flowRoutes.post("/return", async (req, res) => {
  res.redirect("http://localhost:3000/");
});

flowRoutes.post("/result", async (req, res) => {
  try {
    let params = {
      token: req.body.token,
    };

    let serviceName = "payment/getStatus";

    const flowApi = new FlowApi({
      apiKey: process.env.API_KEY_FLOW,
      secretKey: process.env.SECRET_KEY_FLOW,
      apiURL: process.env.API_URL_SANDBOX_FLOW,
    });

    let response = await flowApi.send(serviceName, params, "GET");
    //Actualiza los datos en su sistema
    console.log("API RESULT -> ", response);

    console.log("OPTIONAL ->", response.optional);

    const data = {};

    if (response.status === 2) {
      const paid = await prisma.paids.create({
        data: {},
      });
    }
  } catch (error) {
    res.json({ error });
  }
});

// Exporta el router para ser utilizado en otro lugar
module.exports = flowRoutes;
