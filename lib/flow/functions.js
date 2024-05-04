const FlowApi = require("flowcl-node-api-client");

const flowApi = new FlowApi({
  apiKey: process.env.API_KEY_FLOW,
  secretKey: process.env.SECRET_KEY_FLOW,
  apiURL: process.env.API_URL_SANDBOX_FLOW,
});

export const getPlan = async (body) => {
  try {
    const serviceName = "plans/create";

    let response = await flowApi.send(serviceName, body, "GET");
    console.log(body);
    return response;
  } catch (error) {
    console.log(error);
  }
};
