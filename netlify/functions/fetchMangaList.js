const axios = require('axios');

exports.handler = async (event) => {
  const { query, page = 1 } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=20&offset=${(page-1)*20}&includes[]=cover_art&order[relevance]=desc`;

  try {
    const response = await axios.get(apiUrl);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        data: response.data.data,
        total: response.data.total
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
