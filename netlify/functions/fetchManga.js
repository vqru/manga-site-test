// CORS-enabled Netlify Function
exports.handler = async (event) => {
  const query = event.queryStringParameters.query || "";
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=10`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allows GitHub Pages, localhost, etc.
        "Access-Control-Allow-Methods": "GET", 
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "API failed" }) 
    };
  }
};
