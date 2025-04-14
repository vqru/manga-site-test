const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  const { title, chapter } = event.queryStringParameters;

  if (!title || !chapter) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing title or chapter query parameter' })
    };
  }

  const searchQuery = encodeURIComponent(`${title} chapter ${chapter}`);
  const searchUrl = `https://mangapark.net/search?word=${searchQuery}`;

  try {
    // Step 1: Search MangaPark
    const searchRes = await axios.get(searchUrl, { timeout: 10000 });
    const $search = cheerio.load(searchRes.data);

    // Step 2: Find the first result that matches
    const firstLink = $search('a.item').attr('href');

    if (!firstLink) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Chapter not found on MangaPark' })
      };
    }

    // Step 3: Follow the chapter link
    const chapterUrl = `https://mangapark.net${firstLink}`;
    const chapterRes = await axios.get(chapterUrl, { timeout: 10000 });
    const $chapter = cheerio.load(chapterRes.data);

    // Step 4: Extract image URLs
    const imageUrls = [];
    $chapter('.img-container img').each((i, el) => {
      const src = $chapter(el).attr('src') || $chapter(el).attr('data-src');
      if (src) imageUrls.push(src.startsWith('http') ? src : `https:${src}`);
    });

    if (imageUrls.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No images found in chapter page' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        title,
        chapter,
        images: imageUrls,
        source: chapterUrl
      })
    };
  } catch (error) {
    console.error('MangaPark fallback error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load chapter from MangaPark', message: error.message })
    };
  }
};
