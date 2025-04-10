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
  backBtn: document.getElementById('back-btn')
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
  // Set up event listeners
  elements.searchBtn.addEventListener('click', () => searchManga());
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchManga();
  });

  // Load popular manga by default
  searchManga('popular');
}

async function searchManga(query = null) {
  try {
    const searchQuery = query || elements.searchInput.value || 'popular';
    elements.mangaList.innerHTML = '<div class="loading">Loading manga...</div>';

    const response = await fetch(`/.netlify/functions/fetchMangaList?query=${encodeURIComponent(searchQuery)}`);
    
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    
    const { data, total } = await response.json();
    
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
    // Replace existing cover URL logic with:
const coverArt = manga.relationships.find(r => r.type === 'cover_art');
const coverUrl = coverArt 
  ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`
  : 'https://placehold.co/200x300?text=No+Cover'; // Add fallback
    return `
      <div class="manga-card" data-id="${manga.id}">
        <img src="${coverUrl}" alt="${title}" class="manga-cover" onerror="this.src='https://via.placeholder.com/180x250/cccccc/969696?text=Cover+Error'">
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
      <button onclick="searchManga('popular')">Show Popular Titles</button>
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
      <button onclick="searchManga('popular')">Try Loading Popular Titles</button>
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
    renderChapterList(chapters);
    
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
  const author = manga.relationships.find(r => r.type === 'author');
  const authorName = author?.attributes?.name || 'Unknown author';
  const coverArt = manga.relationships.find(r => r.type === 'cover_art');
  const coverUrl = coverArt ? 
    `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg` : 
    'https://via.placeholder.com/300x450/cccccc/969696?text=No+Cover';

  elements.mangaDetails.innerHTML = `
    <div class="manga-header">
      <img src="${coverUrl}" alt="${title}" class="manga-cover-large" onerror="this.src='https://via.placeholder.com/300x450/cccccc/969696?text=Cover+Error'">
      <div class="manga-meta">
        <h1>${title}</h1>
        <p class="author">By ${authorName}</p>
        <div class="description">${description}</div>
      </div>
    </div>
  `;
}

function renderChapterList(chapters) {
  if (!chapters || chapters.length === 0) {
    elements.chaptersList.innerHTML = '<p class="no-chapters">No chapters available for this manga.</p>';
    return;
  }

  // Group by volume
  const volumes = {};
  chapters.forEach(chapter => {
    const vol = chapter.attributes.volume || 'No Volume';
    if (!volumes[vol]) volumes[vol] = [];
    volumes[vol].push(chapter);
  });

  // Sort volumes
  const sortedVolumes = Object.keys(volumes).sort((a, b) => {
    if (a === 'No Volume') return 1;
    if (b === 'No Volume') return -1;
    return parseFloat(b) - parseFloat(a);
  });

  elements.chaptersList.innerHTML = sortedVolumes.map(vol => {
    return `
      <div class="volume-section">
        <h2>${vol === 'No Volume' ? 'Chapters' : `Volume ${vol}`}</h2>
        <div class="chapter-list">
          ${volumes[vol].map(chapter => {
            const scanGroup = chapter.relationships.find(r => r.type === 'scanlation_group');
            const groupName = scanGroup?.attributes?.name || 'Unknown group';
            const chapterNum = chapter.attributes.chapter ? `Chapter ${chapter.attributes.chapter}` : 'Oneshot';
            
            return `
              <div class="chapter-item" data-id="${chapter.id}">
                <div class="chapter-info">
                  <h3>${chapterNum}</h3>
                  ${chapter.attributes.title ? `<p>${chapter.attributes.title}</p>` : ''}
                </div>
                <div class="chapter-meta">
                  <span class="group-name">${groupName}</span>
                  <button class="read-btn">Read</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Add click events
  document.querySelectorAll('.chapter-item').forEach(item => {
    const readBtn = item.querySelector('.read-btn');
    readBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `reader.html?id=${item.dataset.id}`;
    });
    
    item.addEventListener('click', () => {
      window.location.href = `reader.html?id=${item.dataset.id}`;
    });
  });
}

// ====================
// CHAPTER READER PAGE
// ====================

async function loadChapterReader() {
  try {
    const chapterId = new URLSearchParams(window.location.search).get('id');
    if (!chapterId) return window.location.href = '/';

    elements.chapterPages.innerHTML = '<div class="loading">Loading chapter...</div>';
    
    // Get chapter data
    const [chapterRes, pagesRes] = await Promise.all([
      fetch(`/.netlify/functions/fetchChapterData?id=${chapterId}`),
      fetch(`/.netlify/functions/fetchChapterPages?id=${chapterId}`)
    ]);
    
    const chapterData = await chapterRes.json();
    const { chapter, baseUrl, pages } = await pagesRes.json();
    
    // Set manga ID for back button
    currentMangaId = chapterData.relationships.find(r => r.type === 'manga').id;
    
    renderChapterInfo(chapterData, chapter);
    setupChapterReader(baseUrl, pages);
    
  } // Replace catch block with:
catch (error) {
  console.error('Chapter load error:', error);
  elements.chapterPages.innerHTML = `
    <div class="error">
      Failed to load chapter. Possible reasons:<br>
      1. Chapter not available in English<br>
      2. MangaDex API limit reached<br>
      <a href="details.html?id=${currentMangaId}">Back to Manga</a>
    </div>
  `;
    
    document.getElementById('back-to-manga').addEventListener('click', () => {
      window.location.href = `details.html?id=${currentMangaId}`;
    });
  }
}

function renderChapterInfo(chapterData, chapter) {
  const chapterNum = chapterData.attributes.chapter ? `Chapter ${chapterData.attributes.chapter}` : 'Oneshot';
  const chapterTitle = chapterData.attributes.title ? `: ${chapterData.attributes.title}` : '';
  
  document.getElementById('chapter-title').textContent = `${chapterNum}${chapterTitle}`;
  
  // Set back button URL
  if (elements.backBtn) {
    elements.backBtn.href = `details.html?id=${currentMangaId}`;
  }
}

function setupChapterReader(baseUrl, pages) {
  totalPages = pages.length;
  currentPage = 1;
  
  updatePageControls();
  renderCurrentPage(baseUrl, pages);
  
  // Navigation events
  if (elements.prevPageBtn && elements.nextPageBtn) {
    elements.prevPageBtn.addEventListener('click', () => navigatePage(-1, baseUrl, pages));
    elements.nextPageBtn.addEventListener('click', () => navigatePage(1, baseUrl, pages));
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      navigatePage(-1, baseUrl, pages);
    } else if (e.key === 'ArrowRight') {
      navigatePage(1, baseUrl, pages);
    }
  });
}

function navigatePage(direction, baseUrl, pages) {
  const newPage = currentPage + direction;
  if (newPage < 1 || newPage > totalPages) return;
  
  currentPage = newPage;
  updatePageControls();
  renderCurrentPage(baseUrl, pages);
  
  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentPage(baseUrl, pages) {
  elements.chapterPages.innerHTML = `
    <img 
      src="${baseUrl}/data/${pages[currentPage-1]}" 
      alt="Page ${currentPage}" 
      class="chapter-page"
      onerror="this.src='https://via.placeholder.com/800x1200/cccccc/969696?text=Page+Load+Error'"
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
