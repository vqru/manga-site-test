// netlify/functions/fetchManga.js
exports.handler = async (event) => {
  const query = event.queryStringParameters.query || "";
  const url = `https://api.mangadex.org/manga?title=${query}&limit=10`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "API failed" }) };
  }
};
