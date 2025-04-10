const axios = require('axios');

exports.handler = async (event) => {
  const id = event.queryStringParameters.id;
  const mangaUrl = `https://api.mangadex.org/manga/${id}?includes[]=cover_art`;
  const chaptersUrl = `https://api.mangadex.org/manga/${id}/feed?order[chapter]=asc&limit=100`;

  try {
    const [mangaRes, chaptersRes] = await Promise.all([
      axios.get(mangaUrl),
      axios.get(chaptersUrl)
    ]);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        manga: mangaRes.data,
        chapters: chaptersRes.data
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API failed" }),
    };
  }
};
