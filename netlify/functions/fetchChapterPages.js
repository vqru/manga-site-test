// Replace entire file with:
const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  try {
    const response = await axios.get(`https://api.mangadex.org/at-home/server/${id}`);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch chapter. Try another chapter." })
    };
  }
};
