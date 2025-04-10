const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  try {
    const response = await axios.get(`https://api.mangadex.org/at-home/server/${id}`, {
      timeout: 10000 // 10-second timeout
    });
    
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        baseUrl: response.data.baseUrl,
        pages: response.data.chapter.data,
        externalUrl: `https://mangadex.org/chapter/${id}` // Add MD link
      })
    };
  } catch (error) {
    return {
      statusCode: 200, // Still return MD link even if failed
      body: JSON.stringify({
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  }
};
