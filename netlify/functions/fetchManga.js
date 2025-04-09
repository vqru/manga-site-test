// netlify/functions/fetchManga.js
const axios = require("axios");

exports.handler = async (event, context) => {
  try {
    const { query } = event.queryStringParameters;
    const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=10`;

    const response = await axios.get(apiUrl);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API fetch failed" }),
    };
  }
};
