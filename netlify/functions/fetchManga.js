// Searches manga by title
exports.handler = async (event) => {
  const query = event.queryStringParameters.query || "";
  const apiUrl = `https://api.mangadex.org/manga?title=${query}&limit=10&includes[]=cover_art`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return { 
      statusCode: 200, 
      body: JSON.stringify(data) 
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "API failed" }) 
    };
  }
};
