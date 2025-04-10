// Global State
let currentPage = 1;
let totalPages = 0;
let currentMangaId = null;

// DOM Elements
const elements = {
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  mangaList: document.getElementById('manga-list'),
  mangaDetails: document.getElementById('manga-details'),
  chaptersList: document.getElementById('chapters-list'),
  chapterPages: document.getElementById('chapter-pages'),
  pageIndicator: document.getElementById('page-indicator'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  backBtn: document.getElementById('back-btn'),
  mdLink: document.getElementById('md-link')
};

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('details.html')) {
    loadMangaDetails();
  } else if (window.location.pathname.includes('reader.html')) {
    loadChapterReader();
  } else {
    setupHomepage();
  }
});

// ====================
// HOMEPAGE FUNCTIONALITY
// ====================

function setupHomepage() {
  if (elements.searchBtn && elements.searchInput) {
    elements.searchBtn.addEventListener('click', () => searchManga());
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchManga();
    });
    searchManga('popular');
  }
}

async function searchManga(query = null) {
  try {
    const searchQuery = query || elements.searchInput.value || 'popular';
    elements.mangaList.innerHTML = '<div class="loading">Loading manga...</div>';

    const response = await fetch(`/.netlify/functions/fetchMangaList?query=${encodeURIComponent(searchQuery)}`);
    
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    
    const { data } = await response.json();
    
    if (!data || data.length === 0) {
      showNoResults();
      return;
    }

    renderMangaList(data);
    
  } catch (error) {
    console.error('Search error:', error);
    showErrorState();
  }
}

function renderMangaList(mangaData) {
  elements.mangaList.innerHTML = mangaData.map(manga => {
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled';
    
    // Use the coverUrl that's now directly provided by our updated serverless function
    const coverUrl = manga.coverUrl || 'https://placehold.co/200x300?text=No+Cover';

    return `
      <div class="manga-card" data-id="${manga.id}">
        <img src="${coverUrl}" alt="${title}" class="manga-cover" 
             onerror="this.onerror=null;this.src='https://placehold.co/200x300?text=Cover+Error'">
        <div class="manga-info">
          <h3>${title}</h3>
        </div>
      </div>
    `;
  }).join('');

  // Add click events
  document.querySelectorAll('.manga-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `details.html?id=${card.dataset.id}`;
    });
  });
}

function showNoResults() {
  elements.mangaList.innerHTML = `
    <div class="no-results">
      <p>No manga found for your search.</p>
      <button onclick="searchManga('popular')" class="read-btn">Show Popular Titles</button>
    </div>
  `;
}

function showErrorState() {
  elements.mangaList.innerHTML = `
    <div class="error-state">
      <p>Failed to load manga. Possible issues:</p>
      <ul>
        <li>MangaDex API might be down</li>
        <li>Your network connection</li>
      </ul>
      <button onclick="searchManga('popular')" class="read-btn">Try Loading Popular Titles</button>
    </div>
  `;
}

// ====================
// MANGA DETAILS PAGE
// ====================

async function loadMangaDetails() {
  try {
    const mangaId = new URLSearchParams(window.location.search).get('id');
    if (!mangaId) return window.location.href = '/';
    
    currentMangaId = mangaId;
    elements.mangaDetails.innerHTML = '<div class="loading">Loading manga details...</div>';
    
    const response = await fetch(`/.netlify/functions/fetchMangaDetails?id=${mangaId}`);
    
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    renderMangaDetails(data.manga);
    renderVolumesAndChapters(data.volumes, mangaId);
    
  } catch (error) {
    console.error('Details load error:', error);
    elements.mangaDetails.innerHTML = `
      <div class="error-state">
        <p>Failed to load manga details: ${error.message || 'Unknown error'}</p>
        <a href="/" class="read-btn">Return to Homepage</a>
      </div>
    `;
  }
}

function renderMangaDetails(manga) {
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled';
  const description = manga.attributes.description?.en || 'No description available';
  
  // Get author info
  const author = manga.relationships.find(r => r.type === 'author');
  const artist = manga.relationships.find(r => r.type === 'artist');
  const authorName = author?.attributes?.name || 'Unknown author';
  const artistName = artist?.attributes?.name || (author?.attributes?.name || 'Unknown artist');
  
  // Use the coverUrl that's now directly provided by our updated serverless function
  const coverUrl = manga.coverUrl || 'https://placehold.co/300x450?text=No+Cover';

  // Get genre tags
  const genres = manga.attributes.tags
    ?.filter(tag => tag.attributes?.group === 'genre')
    ?.map(tag => tag.attributes.name.en)
    ?.join(', ') || 'No genres listed';

  elements.mangaDetails.innerHTML = `
    <div class="manga-header">
      <img src="${coverUrl}" alt="${title}" class="manga-cover-large" 
           onerror="this.onerror=null;this.src='https://placehold.co/300x450?text=Cover+Error'">
      <div class="manga-meta">
        <h1>${title}</h1>
        <p class="author">Author: ${authorName}</p>
        <p class="artist">Artist: ${artistName}</p>
        <p class="genres"><strong>Genres:</strong> ${genres}</p>
        <div class="description">${description}</div>
        <p><a href="https://mangadex.org/title/${manga.id}" target="_blank" class="read-btn">View on MangaDex</a></p>
      </div>
    </div>
    <h2 class="chapters-header">Chapters</h2>
    <div id="chapters-list"></div>
  `;
}

function renderVolumesAndChapters(volumes, mangaId) {
  if (!volumes || Object.keys(volumes).length === 0) {
    elements.chaptersList.innerHTML = '<p class="no-chapters">No English chapters available for this manga.</p>';
    return;
  }

  const volumeKeys = Object.keys(volumes);
  
  if (volumeKeys.length === 0) {
    elements.chaptersList.innerHTML = '<p class="no-chapters">No chapters found.</p>';
    return;
  }

  elements.chaptersList.innerHTML = volumeKeys.map(vol => `
    <div class="volume-section">
      <h3>${vol === 'No Volume' ? 'Chapters' : `Volume ${vol}`}</h3>
      <div class="chapter-list">
        ${volumes[vol].map(chapter => {
          return `
            <div class="chapter-item">
              <div class="chapter-info">
                <h4>${chapter.chapter === 'No Chapter' ? 'Oneshot' : `Chapter ${chapter.chapter}`}</h4>
                ${chapter.title ? `<p class="chapter-title">${chapter.title}</p>` : ''}
                <p class="group-name">${chapter.groupName}</p>
              </div>
              <div class="chapter-actions">
                <button onclick="window.location.href='reader.html?id=${chapter.id}'" 
                  class="read-btn">
                  Read
                </button>
                <a href="https://mangadex.org/chapter/${chapter.id}" 
                  target="_blank" 
                  class="md-link">
                  MD
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// ====================
// CHAPTER READER PAGE
// ====================

async function loadChapterReader() {
  try {
    const chapterId = new URLSearchParams(window.location.search).get('id');
    if (!chapterId) return window.location.href = '/';

    // First load chapter data to get the mangaId
    const chapterResponse = await fetch(`/.netlify/functions/fetchChapterData?id=${chapterId}`);
    if (!chapterResponse.ok) throw new Error(`Chapter data request failed with status ${chapterResponse.status}`);
    
    const chapterData = await chapterResponse.json();
    if (chapterData.error) throw new Error(chapterData.error);

    const { chapter } = chapterData;
    
    // Set up back button and chapter info
    document.title = `${chapter.title || `Chapter ${chapter.chapter}`} - MangaReader`;
    
    if (elements.backBtn) {
      elements.backBtn.href = `details.html?id=${chapter.mangaId}`;
      
      // Set up title
      const titleDiv = document.createElement('div');
      titleDiv.className = 'chapter-title';
      titleDiv.innerHTML = `<h1>${chapter.title || `Chapter ${chapter.chapter}`}</h1>`;
      elements.backBtn.after(titleDiv);
    }

    if (elements.mdLink) {
      elements.mdLink.href = `https://mangadex.org/chapter/${chapterId}`;
    }

    elements.chapterPages.innerHTML = '<div class="loading">Loading chapter pages...</div>';
    
    // Now get chapter pages
    const pagesResponse = await fetch(`/.netlify/functions/fetchChapterPages?id=${chapterId}`);
    if (!pagesResponse.ok) throw new Error(`Pages request failed with status ${pagesResponse.status}`);
    
    const pagesData = await pagesResponse.json();
    
    if (pagesData.error) {
      // Show error but with MangaDex fallback
      throw new Error(pagesData.error);
    }
    
    if (pagesData.pageUrls && pagesData.pageUrls.length > 0) {
      // Use the pre-constructed page URLs from our updated function
      setupChapterReader(pagesData.pageUrls);
    } else if (pagesData.baseUrl && pagesData.hash && pagesData.pages) {
      // Fallback to constructing URLs manually
      const pageUrls = pagesData.pages.map(page => 
        `${pagesData.baseUrl}/data/${pagesData.hash}/${page}`
      );
      setupChapterReader(pageUrls);
    } else if (pagesData.externalUrl) {
      // Complete fallback to MangaDex
      showMangaDexFallback(pagesData.externalUrl);
    } else {
      throw new Error('No valid chapter data received');
    }
    
  } catch (error) {
    console.error('Chapter load error:', error);
    showChapterError(error.message);
  }
}

function setupChapterReader(pageUrls) {
  totalPages = pageUrls.length;
  currentPage = 1;
  
  // Render first page
  renderCurrentPage(pageUrls);
  updatePageControls();
  
  // Set up navigation
  if (elements.prevPageBtn && elements.nextPageBtn) {
    elements.prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentPage(pageUrls);
        updatePageControls();
        window.scrollTo(0, 0);
      }
    });
    
    elements.nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage(pageUrls);
        updatePageControls();
        window.scrollTo(0, 0);
      }
    });
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      currentPage--;
      renderCurrentPage(pageUrls);
      updatePageControls();
      window.scrollTo(0, 0);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      currentPage++;
      renderCurrentPage(pageUrls);
      updatePageControls();
      window.scrollTo(0, 0);
    }
  });
}

function renderCurrentPage(pageUrls) {
  elements.chapterPages.innerHTML = `
    <img 
      src="${pageUrls[currentPage-1]}" 
      alt="Page ${currentPage}" 
      class="chapter-page"
      onerror="this.onerror=null;this.src='https://placehold.co/800x1200?text=Page+${currentPage}+Failed+to+Load'"
    >
  `;
}

function updatePageControls() {
  if (elements.pageIndicator) {
    elements.pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  
  if (elements.prevPageBtn) {
    elements.prevPageBtn.disabled = currentPage <= 1;
  }
  
  if (elements.nextPageBtn) {
    elements.nextPageBtn.disabled = currentPage >= totalPages;
  }
}

function showMangaDexFallback(url) {
  elements.chapterPages.innerHTML = `
    <div class="md-fallback">
      <h3>Redirecting to MangaDex...</h3>
      <p>You will be automatically redirected in 3 seconds.</p>
      <p><a href="${url}" target="_blank">Click here</a> if you are not redirected.</p>
    </div>
  `;
  setTimeout(() => {
    window.location.href = url;
  }, 3000);
}

function showChapterError(message) {
  elements.chapterPages.innerHTML = `
    <div class="error-state">
      <h3>Failed to load chapter</h3>
      <p>${message || 'Unknown error occurred'}</p>
      <a href="#" onclick="window.history.back()" class="back-btn">Back to Manga</a>
      <a href="/" class="back-btn">Return to Homepage</a>
    </div>
  `;
}
