const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  
  try {
    // First, fetch chapter data
    const response = await axios.get(`https://api.mangadex.org/at-home/server/${id}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'YourMangaReader/1.0 (contact@example.com)'
      }
    });
    
    // Check if we have valid data
    if (!response.data || !response.data.baseUrl || !response.data.chapter) {
      throw new Error('Invalid chapter data structure received from MangaDex API');
    }
    
    // Get the base URL and chapter data
    const baseUrl = response.data.baseUrl;
    const hash = response.data.chapter.hash;
    
    // Determine which data array to use based on data-saver preference
    const dataSaver = event.queryStringParameters.dataSaver === 'true';
    const pages = dataSaver ? response.data.chapter.dataSaver : response.data.chapter.data;
    
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('No pages found for this chapter');
    }
    
    // Create array of page URLs with correct path based on dataSaver preference
    const pageUrls = pages.map(page => {
      const path = dataSaver ? 'data-saver' : 'data';
      return `${baseUrl}/${path}/${hash}/${page}`;
    });

    // Return the successful response with all the data the frontend needs
    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        baseUrl: baseUrl,
        hash: hash,
        pages: pages,
        pageUrls: pageUrls,
        totalPages: pages.length,
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  } catch (error) {
    console.error('Fetch chapter pages error:', error);
    
    // More detailed error response
    return {
      statusCode: 200, // Still return 200 so frontend can handle the error gracefully
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Failed to load chapter pages",
        message: error.message || "Unknown error occurred",
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  }
};
