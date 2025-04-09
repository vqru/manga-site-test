// Searches manga with CORS support
const axios = require('axios');

exports.handler = async (event) => {
  const query = event.queryStringParameters.query || "";
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=10&includes[]=cover_art`;

  try {
    const response = await axios.get(apiUrl);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow all domains (or replace * with your Netlify URL)
        "Access-Control-Allow-Methods": "GET"
      },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "API failed" }),
    };
  }
};
