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

    // Get content type from response
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // Return the image with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      },
      body: Buffer.from(response.data, 'binary').toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Image proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to proxy image',
        message: error.message,
        url: imageUrl
      })
    };
  }
};
