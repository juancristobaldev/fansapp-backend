module.exports = {
  getExchangesRates: async () => {
    try {
      const responseExchange = await fetch(
        `https://v6.exchangerate-api.com/v6/${process.env.API_KEY_EXCHANGERATE}/latest/USD`
      );

      const responseExchangeJSON = await responseExchange.json();

      if (responseExchangeJSON.result === "success") {
        return responseExchangeJSON.conversion_rates;
      }
    } catch (err) {
      console.error(err);
    }
  },
  convertCLPtoUSD: async (CLP) => {
    try {
      const responseExchange = await fetch(
        `https://v6.exchangerate-api.com/v6/${process.env.API_KEY_EXCHANGERATE}/latest/CLP`
      );

      const responseExchangeJSON = await responseExchange.json();

      return CLP * responseExchangeJSON["USD"];
    } catch (error) {
      console.error(error);
    }
  },
  convertUSDtoCLP: async (USD) => {
    try {
      const responseExchange = await fetch(
        `https://v6.exchangerate-api.com/v6/${process.env.API_KEY_EXCHANGERATE}/latest/USD`
      );

      const responseExchangeJSON = await responseExchange.json();
    } catch (error) {
      console.error(error);
    }
  },
};
