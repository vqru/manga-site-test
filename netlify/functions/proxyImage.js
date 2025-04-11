const axios = require('axios');

exports.handler = async (event) => {
  // Get the URL to proxy from query parameters
  const imageUrl = event.queryStringParameters.url;

  if (!imageUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  try {
    // Get the image with proper headers to avoid CORS and blocking
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'MangaReader/1.0 (manga-reader-app)',
        'Accept': 'image/webp,image/*,*/*;q=0.8',
        'Referer': 'https://mangadex.org/'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400' // Cache for 1 day
      },
      body: response.data.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to proxy image',
        details: error.message || 'Unknown error'
      })
    };
  }
};
