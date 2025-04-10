const axios = require('axios');

exports.handler = async (event) => {
  const { query = 'popular', page = 1 } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=20&includes[]=cover_art&order[followedCount]=desc&offset=${(page - 1) * 20}`;

  try {
    const response = await axios.get(apiUrl, {
      timeout: 8000 // Increased timeout to 8 seconds
    });
    
    if (!response.data.data) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: [], total: 0 })
      };
    }

    // Process manga data to include cover URLs directly in the response
    const processedData = response.data.data.map(manga => {
      // Find cover art relationship
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      let coverFileName = null;
      
      if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
        coverFileName = coverArt.attributes.fileName;
      }
      
      // Add coverUrl directly to manga object
      return {
        ...manga,
        coverUrl: coverFileName ? 
          `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg` : 
          null
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        data: processedData,
        total: response.data.total || 0
      })
    };
    
  } catch (error) {
    console.error('Fetch manga list error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: error.message,
        suggestion: "Try again later or search for different terms"
      })
    };
  }
};
