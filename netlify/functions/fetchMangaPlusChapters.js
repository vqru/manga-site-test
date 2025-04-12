const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;

  try {
    const response = await axios.get(`https://jumpg-webapi.tokyo-cdn.com/api/title_detail?title_id=${id}`);

    if (!response.data || !response.data.success || !response.data.success.chapters) {
      throw new Error('Invalid MangaPlus response');
    }

    const chapters = response.data.success.chapters;

    const formattedChapters = chapters.map(ch => ({
      id: ch.chapterId,
      name: ch.name,
      number: ch.chapter,
      date: ch.publishDate,
      titleId: id
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chapters: formattedChapters
      })
    };
  } catch (error) {
    console.error('MangaPlus chapter fetch error:', error.message);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to fetch MangaPlus chapters',
        message: error.message
      })
    };
  }
};
