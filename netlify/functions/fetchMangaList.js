const axios = require('axios');

exports.handler = async (event) => {
  const {
    query = '',
    page = 1,
    sort = 'followedCount'
  } = event.queryStringParameters;

  const offset = (page - 1) * 20;

  const apiUrl = `https://api.mangadex.org/manga?limit=20&includes[]=cover_art&title=${encodeURIComponent(query)}&offset=${offset}&order[${sort}]=desc`;

  try {
    const response = await axios.get(apiUrl, {
      timeout: 8000 // 8-second timeout
    });

    const mangaList = response.data.data;

    if (!mangaList || !Array.isArray(mangaList)) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: [], total: 0 })
      };
    }

    const processedData = mangaList.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFile = coverArt?.attributes?.fileName;

      return {
        ...manga,
        coverUrl: coverFile
          ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFile}.256.jpg`
          : null
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
    console.error('Error fetching manga list:', error.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to fetch manga list',
        details: error.message
      })
    };
  }
};
