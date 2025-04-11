const axios = require('axios');

exports.handler = async (event) => {
  const { query = 'popular', page = 1 } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=20&includes[]=cover_art&order[followedCount]=desc&offset=${(page - 1) * 20}`;

  try {
    const response = await axios.get(apiUrl, { timeout: 8000 });
    
    if (!response.data.data) {
      return {
        statusCode: 200,
        body: JSON.stringify({ data: [], total: 0 })
      };
    }

    const processedData = response.data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFileName = coverArt?.attributes?.fileName;
      
      return {
        ...manga,
        coverUrl: coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}` : null
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: processedData,
        total: response.data.total || 0
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        suggestion: "Try again later"
      })
    };
  }
};
