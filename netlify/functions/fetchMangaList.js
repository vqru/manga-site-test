const axios = require('axios');

exports.handler = async (event) => {
  const { query = 'popular', page = 1 } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=20&offset=${(page-1)*20}&includes[]=cover_art&order[followedCount]=desc`;

  try {
    const response = await axios.get(apiUrl, {
      timeout: 5000 // 5 second timeout
    });
    
    if (!response.data.data) {
      return {
        statusCode: 200,
        body: JSON.stringify({ data: [], total: 0 })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        data: response.data.data,
        total: response.data.total || 0
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        suggestion: "Try again later or search for different terms"
      })
    };
  }
};
