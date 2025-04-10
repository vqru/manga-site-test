const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/at-home/server/${id}`;

  try {
    const response = await axios.get(apiUrl);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
