const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  try {
    // Validate input
    const { title, chapter } = event.queryStringParameters;
    if (!title || !chapter) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing title or chapter parameter' })
      };
    }

    // Clean inputs
    const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const cleanChapter = chapter.replace(/\D/g, '');

    // Configure request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    // Step 1: Search MangaPark
    const searchUrl = `https://mangapark.net/search?word=${encodeURIComponent(`${cleanTitle} ${cleanChapter}`)}`;
    const { data: searchData } = await axios.get(searchUrl, { 
      headers,
      timeout: 10000 
    });

    // Step 2: Parse results
    const $ = cheerio.load(searchData);
    const firstResult = $('a.item').first().attr('href');
    
    if (!firstResult) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Chapter not found on MangaPark' })
      };
    }

    // Step 3: Fetch chapter
    const chapterUrl = `https://mangapark.net${firstResult}`;
    const { data: chapterData } = await axios.get(chapterUrl, { 
      headers,
      timeout: 15000 
    });

    // Step 4: Extract images
    const imageUrls = [];
    const $chapter = cheerio.load(chapterData);
    $chapter('.img-container img').each((i, el) => {
      const src = $chapter(el).attr('src') || $chapter(el).attr('data-src');
      if (src) imageUrls.push(src.startsWith('http') ? src : `https:${src}`);
    });

    if (imageUrls.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No images found in chapter' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        images: imageUrls,
        source: chapterUrl
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to load from MangaPark',
        details: error.message 
      })
    };
  }
};
