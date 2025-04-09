// Gets full manga details by ID
exports.handler = async (event) => {
  const id = event.queryStringParameters.id;
  const apiUrl = `https://api.mangadex.org/manga/${id}?includes[]=artist&includes[]=author&includes[]=cover_art`;

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
