const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  const mangaUrl = `https://api.mangadex.org/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`;
  const chaptersUrl = `https://api.mangadex.org/manga/${id}/feed?limit=100&order[volume]=desc&order[chapter]=desc&translatedLanguage[]=en&includes[]=scanlation_group`;

  try {
    const [mangaRes, chaptersRes] = await Promise.all([
      axios.get(mangaUrl, { timeout: 8000 }),
      axios.get(chaptersUrl, { timeout: 8000 })
    ]);

    // Process manga data to include cover URL directly
    const manga = mangaRes.data.data;
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    let coverFileName = null;
    
    if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
      coverFileName = coverArt.attributes.fileName;
    }
    
    // Add coverUrl directly to manga object
    manga.coverUrl = coverFileName ? 
      `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg` : 
      null;

    // Process chapters data to organize by volume
    const chapters = chaptersRes.data.data;
    const organizedChapters = {};
    
    chapters.forEach(chapter => {
      if (!chapter.attributes) return;
      
      const volumeNum = chapter.attributes.volume || 'No Volume';
      const chapterNum = chapter.attributes.chapter || 'No Chapter';
      const title = chapter.attributes.title || `Chapter ${chapterNum}`;
      
      if (!organizedChapters[volumeNum]) {
        organizedChapters[volumeNum] = [];
      }
      
      organizedChapters[volumeNum].push({
        id: chapter.id,
        chapter: chapterNum,
        title: title,
        pages: chapter.attributes.pages || 0,
        publishedAt: chapter.attributes.publishAt,
        groupName: chapter.relationships?.find(r => r.type === 'scanlation_group')?.attributes?.name || 'Unknown'
      });
    });
    
    // Sort volumes and chapters
    const sortedVolumes = Object.keys(organizedChapters).sort((a, b) => {
      // Handle 'No Volume' special case
      if (a === 'No Volume') return 1;
      if (b === 'No Volume') return -1;
      return parseFloat(b) - parseFloat(a); // Descending order
    });
    
    const volumesWithChapters = {};
    sortedVolumes.forEach(volume => {
      volumesWithChapters[volume] = organizedChapters[volume].sort((a, b) => {
        if (a.chapter === 'No Chapter') return 1;
        if (b.chapter === 'No Chapter') return -1;
        return parseFloat(b.chapter) - parseFloat(a.chapter); // Descending order
      });
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        manga: manga,
        volumes: volumesWithChapters
      })
    };
  } catch (error) {
    console.error('Fetch manga details error:', error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        error: "Failed to load manga details", 
        message: error.message 
      })
    };
  }
};
