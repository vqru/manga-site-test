const axios = require('axios');

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;
  const apiUrl = `https://api.mangadex.org/chapter/${id}?includes[]=scanlation_group&includes[]=manga`;

  try {
    const response = await axios.get(apiUrl, { timeout: 8000 });
    const chapter = response.data.data;
    
    // Find manga relationship
    const mangaRelationship = chapter.relationships.find(r => r.type === 'manga');
    if (!mangaRelationship) {
      throw new Error('Manga relationship not found');
    }
    
    // Find group relationship
    const groupRelationship = chapter.relationships.find(r => r.type === 'scanlation_group');
    const groupName = groupRelationship?.attributes?.name || 'Unknown';
    
    // Process chapter data for easier frontend usage
    const processedChapter = {
      id: chapter.id,
      title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`,
      chapter: chapter.attributes.chapter || 'N/A',
      volume: chapter.attributes.volume || 'N/A',
      pages: chapter.attributes.pages || 0,
      translatedLanguage: chapter.attributes.translatedLanguage,
      publishedAt: chapter.attributes.publishAt,
      groupName: groupName,
      mangaId: mangaRelationship.id
    };

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        chapter: processedChapter
      })
    };
  } catch (error) {
    console.error('Fetch chapter data error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: "Failed to load chapter data",
        message: error.message
      })
    };
  }
};
