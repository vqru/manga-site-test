const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  
  try {
    // First, fetch chapter data with improved headers and timeout settings
    const response = await axios.get(`https://api.mangadex.org/at-home/server/${id}`, {
      timeout: 20000, // Increased timeout for slower connections
      headers: {
        'User-Agent': 'MangaReader/1.0 (manga-reader-app)',
        'Accept': 'application/json',
        'Origin': 'https://your-site-domain.netlify.app', // Update with your actual domain
        'Referer': 'https://your-site-domain.netlify.app/' // Update with your actual domain
      }
    });
    
    // Check if we have valid data
    if (!response.data || !response.data.baseUrl || !response.data.chapter) {
      throw new Error('Invalid chapter data structure received from MangaDex API');
    }
    
    // Get the base URL and chapter data
    const baseUrl = response.data.baseUrl;
    const hash = response.data.chapter.hash;
    
    // Default to dataSaver to reduce loading issues
    const dataSaver = event.queryStringParameters.dataSaver !== 'false'; // Default to true
    const pages = dataSaver ? response.data.chapter.dataSaver : response.data.chapter.data;
    
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('No pages found for this chapter');
    }
    
    // Create array of page URLs with correct path based on dataSaver preference
    // Try both patterns the MangaDex API may use
    const pageUrls = pages.map(page => {
      const path = dataSaver ? 'data-saver' : 'data';
      return `${baseUrl}/${path}/${hash}/${page}`;
    });

    // Create a proxied version of URLs through our serverless function for CORS issues
    const proxiedPageUrls = pages.map(page => {
      const path = dataSaver ? 'data-saver' : 'data';
      return `/.netlify/functions/proxyImage?url=${encodeURIComponent(`${baseUrl}/${path}/${hash}/${page}`)}`;
    });

    // Return the successful response with all the data the frontend needs
    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Cache-Control": "max-age=300" // Cache for 5 minutes
      },
      body: JSON.stringify({
        baseUrl: baseUrl,
        hash: hash,
        pages: pages,
        pageUrls: pageUrls,
        proxiedPageUrls: proxiedPageUrls, // Add proxied URLs as an alternative
        totalPages: pages.length,
        externalUrl: `https://mangadex.org/chapter/${id}`,
        useProxy: true // Flag to indicate if proxy should be used by default
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
        externalUrl: `https://mangadex.org/chapter/${id}`,
        errorDetails: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }
      })
    };
  }
};
