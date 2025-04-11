const axios = require('axios');

exports.handler = async (event) => {
  const imageUrl = event.queryStringParameters.url;
  
  if (!imageUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  try {
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'MangaReader/1.0',
        'Accept': 'image/webp,image/*,*/*;q=0.8',
        'Referer': 'https://mangadex.org/'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      },
      body: Buffer.from(response.data, 'binary').toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to proxy image',
        url: imageUrl
      })
    };
  }
};
