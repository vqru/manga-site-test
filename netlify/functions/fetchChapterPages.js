const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  
  try {
    const response = await axios.get(`https://api.mangadex.org/at-home/server/${id}`, {
      timeout: 10000
    });
    
    // Check if we have valid data
    if (!response.data.baseUrl || !response.data.chapter || !response.data.chapter.data) {
      throw new Error('Invalid chapter data structure');
    }
    
    // Process chapter data for easier frontend usage
    const baseUrl = response.data.baseUrl;
    const hash = response.data.chapter.hash;
    const pages = response.data.chapter.data;
    
    // Create array of page URLs for easier frontend use
    const dataSaver = event.queryStringParameters.dataSaver === 'true';
    const pageUrls = pages.map(page => {
      if (dataSaver) {
        return `${baseUrl}/data-saver/${hash}/${page}`;
      } else {
        return `${baseUrl}/data/${hash}/${page}`;
      }
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        baseUrl: baseUrl,
        hash: hash,
        pages: pages,
        pageUrls: pageUrls,
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  } catch (error) {
    console.error('Fetch chapter pages error:', error);
    return {
      statusCode: 200, // Still return 200 so frontend can handle redirect
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Failed to load chapter pages",
        message: error.message,
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  }
};
