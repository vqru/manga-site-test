const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;

  try {
    // Request MangaPlus viewer data
    const response = await axios.get(`https://jumpg-webapi.tokyo-cdn.com/api/manga_viewer?chapter_id=${id}&split=no&img_quality=super_high`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'MangaReader/1.0 (manga-reader-app)',
        'Accept': 'application/json',
        'Origin': 'https://your-site-domain.netlify.app',
        'Referer': 'https://your-site-domain.netlify.app/'
      }
    });

    const pages = response.data.success?.mangaPages;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('No pages found in MangaPlus response');
    }

    // Prepare direct and proxied image URLs
    const pageUrls = pages.map(p => 
      `https://img.jumpplus.com/web/comic_image/${p.image.server}/${p.image.path}`
    );

    const proxiedPageUrls = pageUrls.map(url => 
      `/.netlify/functions/proxyImage?url=${encodeURIComponent(url)}`
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Cache-Control": "max-age=300"
      },
      body: JSON.stringify({
        pageUrls: pageUrls,
        proxiedPageUrls: proxiedPageUrls,
        totalPages: pageUrls.length,
        externalUrl: `https://mangaplus.shueisha.co.jp/viewer/${id}`,
        useProxy: false // Let frontend decide based on load
      })
    };
  } catch (error) {
    console.error('Fetch chapter pages error (MangaPlus):', error);

    return {
      statusCode: 200, // Let frontend show a fallback even if it's an error
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Failed to load chapter pages",
        message: error.message || "Unknown error",
        externalUrl: `https://mangaplus.shueisha.co.jp/viewer/${id}`,
        errorDetails: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }
      })
    };
  }
};
