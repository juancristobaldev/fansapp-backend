const FlowApi = require("flowcl-node-api-client");

const flowApi = new FlowApi({
  apiKey: process.env.API_KEY_FLOW,
  secretKey: process.env.SECRET_KEY_FLOW,
  apiURL: process.env.API_URL_SANDBOX_FLOW,
});

module.exports = {
  getPlan: async (body) => {
    try {
      const serviceName = "plans/get";

      let response = await flowApi
        .send(serviceName, body, "GET")
        .catch((error) => console.log(error));
      console.log(body);
      return response;
    } catch (error) {
      console.error(error);
    }
  },
  createPlan: async (body) => {
    try {
      const serviceName = "plans/create";

      let response = await flowApi
        .send(serviceName, body, "POST")
        .catch((error) => console.log(error));
      console.log(body);
      return response;
    } catch (error) {
      console.error(error);
    }
  },
  editPlan: async (body) => {
    try {
      const serviceName = "plans/edit";

      let response = await flowApi
        .send(serviceName, body, "POST")
        .catch((error) => console.log(error));
      console.log(body);
      return response;
    } catch (error) {
      console.error(error);
    }
  },
};
