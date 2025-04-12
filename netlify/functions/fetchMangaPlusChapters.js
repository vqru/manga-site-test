const axios = require('axios');

exports.handler = async (event) => {
  const { title } = event.queryStringParameters;

  if (!title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing title query parameter' })
    };
  }

  try {
    // 1. Get all titles from MangaPlus
    const allTitlesRes = await axios.get('https://jumpg-webapi.tokyo-cdn.com/api/title_list/all');
    const englishTitles = allTitlesRes.data.success.titleGroups.find(g => g.language === 'en')?.titles || [];

    // 2. Try to match the title (case-insensitive exact match or close match)
    const normalizedInput = title.trim().toLowerCase();
    const matchedTitle = englishTitles.find(t =>
      t.name.toLowerCase() === normalizedInput ||
      t.name.toLowerCase().includes(normalizedInput)
    );

    if (!matchedTitle) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No matching MangaPlus title found for: ' + title })
      };
    }

    const titleId = matchedTitle.titleId;

    // 3. Fetch chapters using the matched title ID
    const detailRes = await axios.get(`https://jumpg-webapi.tokyo-cdn.com/api/title_detail?title_id=${titleId}`);
    const chapters = detailRes.data.success.chapters || [];

    const formatted = chapters.map(ch => ({
      id: ch.chapterId,
      name: ch.name,
      number: ch.chapter,
      date: ch.publishDate,
      titleId: titleId
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chapters: formatted,
        matched: matchedTitle.name,
        titleId: titleId
      })
    };
  } catch (error) {
    console.error('MangaPlus error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch MangaPlus chapters',
        message: error.message
      })
    };
  }
};
