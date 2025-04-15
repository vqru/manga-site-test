const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  const { title, chapter } = event.queryStringParameters;

  if (!title || !chapter || isNaN(chapter)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid title or chapter parameter' })
    };
  }

  const searchQuery = encodeURIComponent(`${title} chapter ${chapter}`);
  const searchUrl = `https://mangapark.net/search?word=${searchQuery}`;

  try {
    // Step 1: Search MangaPark
    const searchRes = await axios.get(searchUrl, { timeout: 15000 });
    const $search = cheerio.load(searchRes.data);

    // Step 2: Find matching chapter link
    let chapterLink = '';
    $search('a.item').each((i, el) => {
      const text = $search(el).text().toLowerCase();
      const chapNum = text.match(/chapter\s+(\d+)/)?.[1];
      if (chapNum === chapter) {
        chapterLink = $search(el).attr('href');
        return false; // Break loop
      }
    });

    if (!chapterLink) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Chapter ${chapter} not found for ${title}` })
      };
    }

    // Step 3: Fetch chapter page
    const chapterUrl = `https://mangapark.net${chapterLink}`;
    const chapterRes = await axios.get(chapterUrl, { timeout: 20000 });
    const $chapter = cheerio.load(chapterRes.data);

    // Step 4: Extract images
    const imageUrls = [];
    $chapter('.img-container img').each((i, el) => {
      const src = $chapter(el).attr('src') || $chapter(el).attr('data-src');
      if (src) imageUrls.push(src.startsWith('http') ? src : `https:${src}`);
    });

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
    console.error('MangaPark Error:', error.message);
    const status = error.response?.status || 500;
    return {
      statusCode: status,
      body: JSON.stringify({ 
        error: status === 404 ? 'Chapter not found' : 'Server error',
        details: error.message 
      })
    };
  }
};
