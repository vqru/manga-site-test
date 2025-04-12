const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  
  try {
    // Fetch chapter data with proper headers
    const chapterResponse = await axios.get(`https://api.mangadex.org/chapter/${id}?includes[]=manga&includes[]=scanlation_group`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'MangaReader/1.0 (manga-reader-app)',
        'Accept': 'application/json'
      }
    });

    if (!chapterResponse.data || !chapterResponse.data.data) {
      throw new Error('Invalid API response format');
    }

    const chapterData = chapterResponse.data.data;
    
    // Get related manga info
    let mangaId = null;
    let mangaTitle = null;
    let coverArt = null;
    
    if (chapterData.relationships) {
      const mangaRel = chapterData.relationships.find(rel => rel.type === 'manga');
      if (mangaRel) {
        mangaId = mangaRel.id;
        
        // If manga has attributes, try to get title
        if (mangaRel.attributes && mangaRel.attributes.title) {
          mangaTitle = Object.values(mangaRel.attributes.title)[0];
        }
      }
      
      // Try to find cover art relationship
      const coverRel = chapterData.relationships.find(rel => rel.type === 'cover_art');
      if (coverRel && coverRel.attributes) {
        coverArt = coverRel.attributes.fileName;
      }
    }
    
    // Get scanlation group info
    let groupName = "Unknown Group";
    
    if (chapterData.relationships) {
      const groupRel = chapterData.relationships.find(rel => rel.type === 'scanlation_group');
      if (groupRel && groupRel.attributes) {
        groupName = groupRel.attributes.name;
      }
    }
    
    // If we have manga ID but no title, try to fetch manga details
    if (mangaId && !mangaTitle) {
      try {
        const mangaResponse = await axios.get(`https://api.mangadex.org/manga/${mangaId}`, {
          timeout: 8000,
          headers: {
            'User-Agent': 'MangaReader/1.0 (manga-reader-app)',
            'Accept': 'application/json'
          }
        });
        
        if (mangaResponse.data && mangaResponse.data.data && mangaResponse.data.data.attributes) {
          const titles = mangaResponse.data.data.attributes.title;
          if (titles) {
            // Prioritize English title, fallback to any available
            mangaTitle = titles.en || Object.values(titles)[0];
          }
        }
      } catch (mangaError) {
        console.error('Error fetching manga details:', mangaError);
        // Continue with the process even if manga details fetch fails
      }
    }
    
    // Prepare chapter info from attributes
    const chapter = {
      id: chapterData.id,
      mangaId: mangaId,
      title: chapterData.attributes.title || null,
      chapter: chapterData.attributes.chapter || null,
      volume: chapterData.attributes.volume || null,
      translatedLanguage: chapterData.attributes.translatedLanguage || 'unknown',
      publishAt: chapterData.attributes.publishAt || null,
      pages: chapterData.attributes.pages || 0,
      mangaTitle: mangaTitle,
      groupName: groupName,
      coverArt: coverArt ? `https://uploads.mangadex.org/covers/${mangaId}/${coverArt}` : null
    };
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600" // Cache for 1 hour
      },
      body: JSON.stringify({
        chapter: chapter,
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  } catch (error) {
    console.error('Fetch chapter data error:', error);
    
    return {
      statusCode: 200, // Still return 200 for frontend handling
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Failed to fetch chapter data",
        message: error.message || "Unknown error occurred",
        externalUrl: `https://mangadex.org/chapter/${id}`
      })
    };
  }
};
