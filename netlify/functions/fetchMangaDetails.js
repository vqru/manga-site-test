const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  const mangaUrl = `https://api.mangadex.org/manga/${id}?includes[]=cover_art&includes[]=author`;
const chaptersUrl = `https://api.mangadex.org/manga/${id}/feed?limit=100&order[chapter]=desc&translatedLanguage[]=en`;

  try {
    const [mangaRes, chaptersRes] = await Promise.all([
      axios.get(mangaUrl),
      axios.get(chaptersUrl)
    ]);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        manga: mangaRes.data.data,
        chapters: chaptersRes.data.data
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
