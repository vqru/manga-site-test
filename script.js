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
    const coverArt = manga.relationships.find(r => r.type === 'cover_art');
    const coverUrl = coverArt 
      ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`
      : 'https://placehold.co/200x300?text=No+Cover';

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

    elements.mangaDetails.innerHTML = '<div class="loading">Loading manga details...</div>';
    
    const response = await fetch(`/.netlify/functions/fetchMangaDetails?id=${mangaId}`);
    const { manga, chapters } = await response.json();
    
    renderMangaDetails(manga);
    renderChapterList(chapters, mangaId);
    
  } catch (error) {
    console.error('Details load error:', error);
    elements.mangaDetails.innerHTML = `
      <div class="error-state">
        <p>Failed to load manga details.</p>
        <a href="/">Return to Homepage</a>
      </div>
    `;
  }
}

function renderMangaDetails(manga) {
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled';
  const description = manga.attributes.description.en || 'No description available';
  const author = manga.relationships.find(r => r.type === 'author') || 
                 manga.relationships.find(r => r.type === 'artist');
  const authorName = author?.attributes?.name || 'Unknown author';
  const coverArt = manga.relationships.find(r => r.type === 'cover_art');
  const coverUrl = coverArt 
    ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg` 
    : 'https://placehold.co/300x450?text=No+Cover';

  elements.mangaDetails.innerHTML = `
    <div class="manga-header">
      <img src="${coverUrl}" alt="${title}" class="manga-cover-large" 
           onerror="this.onerror=null;this.src='https://placehold.co/300x450?text=Cover+Error'">
      <div class="manga-meta">
        <h1>${title}</h1>
        <p class="author">By ${authorName}</p>
        <div class="description">${description}</div>
      </div>
    </div>
    <div id="chapters-list"></div>
  `;
}

function renderChapterList(chapters, mangaId) {
  if (!chapters || chapters.length === 0) {
    elements.chaptersList.innerHTML = '<p class="no-chapters">No English chapters available for this manga.</p>';
    return;
  }

  // Group chapters by volume
  const volumes = {};
  chapters.forEach(chapter => {
    const vol = chapter.attributes.volume || 'No Volume';
    if (!volumes[vol]) volumes[vol] = [];
    volumes[vol].push(chapter);
  });

  // Sort volumes - No Volume first, then newest volumes
  const sortedVolumes = Object.keys(volumes).sort((a, b) => {
    if (a === 'No Volume') return -1;
    if (b === 'No Volume') return 1;
    return parseFloat(b) - parseFloat(a); // Newest volumes first
  });

  elements.chaptersList.innerHTML = sortedVolumes.map(vol => `
    <div class="volume-section">
      <h2>${vol === 'No Volume' ? 'Latest Chapters' : `Volume ${vol}`}</h2>
      <div class="chapter-list">
        ${volumes[vol].map(chapter => {
          const scanGroup = chapter.relationships.find(r => r.type === 'scanlation_group');
          const groupName = scanGroup?.attributes?.name || 'Unknown group';
          const chapterNum = chapter.attributes.chapter ? `Ch. ${chapter.attributes.chapter}` : 'Oneshot';
          const title = chapter.attributes.title ? `<p>${chapter.attributes.title}</p>` : '';
          
          return `
            <div class="chapter-item">
              <div class="chapter-info">
                <h3>${chapterNum}</h3>
                ${title}
                <p class="group-name">${groupName}</p>
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

    if (elements.backBtn) {
      elements.backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }

    if (elements.mdLink) {
      elements.mdLink.href = `https://mangadex.org/chapter/${chapterId}`;
    }

    elements.chapterPages.innerHTML = '<div class="loading">Loading chapter...</div>';
    
    // Get chapter data
    const response = await fetch(`/.netlify/functions/fetchChapterPages?id=${chapterId}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    if (data.baseUrl && data.pages) {
      // Successfully got chapter pages
      setupChapterReader(data.baseUrl, data.pages);
    } else if (data.externalUrl) {
      // Fallback to MangaDex
      showMangaDexFallback(data.externalUrl);
    } else {
      throw new Error('No chapter data available');
    }
    
  } catch (error) {
    console.error('Chapter load error:', error);
    showChapterError(error.message);
  }
}

function setupChapterReader(baseUrl, pages) {
  totalPages = pages.length;
  currentPage = 1;
  
  // Render first page
  renderCurrentPage(baseUrl, pages);
  updatePageControls();
  
  // Set up navigation
  if (elements.prevPageBtn && elements.nextPageBtn) {
    elements.prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentPage(baseUrl, pages);
        updatePageControls();
        window.scrollTo(0, 0);
      }
    });
    
    elements.nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage(baseUrl, pages);
        updatePageControls();
        window.scrollTo(0, 0);
      }
    });
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      currentPage--;
      renderCurrentPage(baseUrl, pages);
      updatePageControls();
      window.scrollTo(0, 0);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      currentPage++;
      renderCurrentPage(baseUrl, pages);
      updatePageControls();
      window.scrollTo(0, 0);
    }
  });
}

function renderCurrentPage(baseUrl, pages) {
  elements.chapterPages.innerHTML = `
    <img 
      src="${baseUrl}/data/${pages[currentPage-1]}" 
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
