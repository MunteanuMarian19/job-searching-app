// netlify/functions/jsearch-proxy.js
const axios = require("axios");

exports.handler = async function (event, context) {
  // Retrieve parameters from the query string
  const { query, page, num_pages, country, date_posted } =
    event.queryStringParameters;

  // Use your API key from environment variables (set in Netlify dashboard)
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: "API key not configured",
    };
  }

  const options = {
    method: "GET",
    url: "https://jsearch.p.rapidapi.com/search",
    params: {
      query: query,
      page: page,
      num_pages: num_pages,
      country: country,
      date_posted: date_posted,
    },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "jsearch.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error in proxy:", error);
    return {
      statusCode: error.response ? error.response.status : 500,
      body: JSON.stringify(
        error.response ? error.response.data : error.message
      ),
    };
  }
};
