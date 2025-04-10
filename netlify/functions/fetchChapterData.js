const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/chapter/${id}?includes[]=scanlation_group&includes[]=manga`;

  try {
    const response = await axios.get(apiUrl);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        chapter: response.data.data,
        mangaId: response.data.data.relationships.find(r => r.type === 'manga').id
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
