// Global state
let currentMangaId = null;
let currentChapterId = null;
let currentPage = 1;
let totalPages = 1;

// DOM Elements
const elements = {
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  mangaList: document.getElementById('manga-list'),
  pagination: document.getElementById('pagination'),
  mangaDetails: document.getElementById('manga-details'),
  chaptersList: document.getElementById('chapters-list'),
  chapterTitle: document.getElementById('chapter-title'),
  chapterPages: document.getElementById('chapter-pages'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  pageIndicator: document.getElementById('page-indicator'),
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

// Homepage Functions
function setupHomepage() {
  elements.searchBtn.addEventListener('click', searchManga);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchManga();
  });
  searchManga('popular');
}

async function searchManga(query = null) {
  const searchQuery = query || elements.searchInput.value;
  if (!searchQuery) return;

  try {
    const response = await fetch(`/.netlify/functions/fetchMangaList?query=${encodeURIComponent(searchQuery)}`);
    const { data, total } = await response.json();
    
    renderMangaList(data);
    renderPagination(total, searchQuery);
  } catch (error) {
    console.error('Search failed:', error);
    elements.mangaList.innerHTML = '<p>Failed to load manga. Please try again.</p>';
  }
}

function renderMangaList(mangaData) {
  elements.mangaList.innerHTML = mangaData.map(manga => {
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled';
    const coverArt = manga.relationships.find(r => r.type === 'cover_art');
    const coverUrl = coverArt ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg` : '';

    return `
      <div class="manga-card" data-id="${manga.id}">
        <img src="${coverUrl}" alt="${title}" class="manga-cover">
        <div class="manga-info">
          <h3>${title}</h3>
        </div>
      </div>
    `;
  }).join('');

  // Add click event to each manga card
  document.querySelectorAll('.manga-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `details.html?id=${card.dataset.id}`;
    });
  });
}

// Manga Details Functions
async function loadMangaDetails() {
  const mangaId = new URLSearchParams(window.location.search).get('id');
  if (!mangaId) return window.location.href = '/';

  try {
    const response = await fetch(`/.netlify/functions/fetchMangaDetails?id=${mangaId}`);
    const { manga, chapters } = await response.json();
    
    renderMangaDetails(manga);
    renderChapterList(chapters);
  } catch (error) {
    console.error('Failed to load manga details:', error);
    elements.mangaDetails.innerHTML = '<p>Failed to load manga details.</p>';
  }
}

function renderMangaDetails(manga) {
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled';
  const description = manga.attributes.description.en || 'No description available';
  const author = manga.relationships.find(r => r.type === 'author');
  const authorName = author?.attributes?.name || 'Unknown';
  const coverArt = manga.relationships.find(r => r.type === 'cover_art');
  const coverUrl = coverArt ? `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg` : '';

  elements.mangaDetails.innerHTML = `
    <div class="manga-header">
      <img src="${coverUrl}" alt="${title}" class="manga-cover-large">
      <div class="manga-meta">
        <h1>${title}</h1>
        <p class="author">By ${authorName}</p>
        <div class="description">${description}</div>
      </div>
    </div>
  `;
}

function renderChapterList(chapters) {
  // Group chapters by volume
  const volumes = {};
  chapters.forEach(chapter => {
    const vol = chapter.attributes.volume || 'None';
    if (!volumes[vol]) volumes[vol] = [];
    volumes[vol].push(chapter);
  });

  // Sort volumes
  const sortedVolumes = Object.keys(volumes).sort((a, b) => {
    if (a === 'None') return 1;
    if (b === 'None') return -1;
    return parseFloat(b) - parseFloat(a);
  });

  elements.chaptersList.innerHTML = sortedVolumes.map(vol => {
    return `
      <div class="volume-section">
        <h2>${vol === 'None' ? 'No Volume' : `Volume ${vol}`}</h2>
        <div class="chapter-list">
          ${volumes[vol].map(chapter => {
            const scanlationGroup = chapter.relationships.find(r => r.type === 'scanlation_group');
            const groupName = scanlationGroup?.attributes?.name || 'Unknown Group';
            
            return `
              <div class="chapter-item" data-id="${chapter.id}">
                <div>
                  <h3>${chapter.attributes.chapter ? `Chapter ${chapter.attributes.chapter}` : 'Oneshot'}</h3>
                  <p>${chapter.attributes.title || ''}</p>
                </div>
                <div>
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

  // Add click events to chapter items
  document.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('read-btn')) return;
      window.location.href = `reader.html?id=${item.dataset.id}`;
    });
  });
}

// Chapter Reader Functions
async function loadChapterReader() {
  const chapterId = new URLSearchParams(window.location.search).get('id');
  if (!chapterId) return window.location.href = '/';

  try {
    // Load chapter metadata
    const chapterRes = await fetch(`/.netlify/functions/fetchChapterData?id=${chapterId}`);
    const chapterData = await chapterRes.json();
    
    // Load chapter pages
    const pagesRes = await fetch(`/.netlify/functions/fetchChapterPages?id=${chapterId}`);
    const { chapter, baseUrl, pages } = await pagesRes.json();
    
    renderChapterReader(chapterData, chapter, baseUrl, pages);
  } catch (error) {
    console.error('Failed to load chapter:', error);
    elements.chapterPages.innerHTML = '<p>Failed to load chapter. Please try again.</p>';
  }
}

function renderChapterReader(chapterData, chapter, baseUrl, pages) {
  const chapterNum = chapterData.attributes.chapter ? `Chapter ${chapterData.attributes.chapter}` : 'Oneshot';
  const chapterTitle = chapterData.attributes.title ? `: ${chapterData.attributes.title}` : '';
  
  elements.chapterTitle.textContent = `${chapterNum}${chapterTitle}`;
  elements.backBtn.href = `details.html?id=${chapterData.relationships.find(r => r.type === 'manga').id}`;
  
  totalPages = pages.length;
  updatePageControls();
  
  // Render initial page
  renderPage(currentPage, baseUrl, pages);
  
  // Navigation events
  elements.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage, baseUrl, pages);
      updatePageControls();
    }
  });
  
  elements.nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage, baseUrl, pages);
      updatePageControls();
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      currentPage--;
      renderPage(currentPage, baseUrl, pages);
      updatePageControls();
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage, baseUrl, pages);
      updatePageControls();
    }
  });
}

function renderPage(pageNum, baseUrl, pages) {
  elements.chapterPages.innerHTML = `
    <img src="${baseUrl}/data/${pages[pageNum-1]}" alt="Page ${pageNum}" class="chapter-page">
  `;
}

function updatePageControls() {
  elements.pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  elements.prevPageBtn.disabled = currentPage === 1;
  elements.nextPageBtn.disabled = currentPage === totalPages;
}
