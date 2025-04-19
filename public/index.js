// ===== CONFIG =====
const API_BASE = '/.netlify/functions';
let currentPage = 1;
let currentSearch = '';

// ===== DOM ELEMENTS =====
const elements = {
  search: document.getElementById('search'),
  searchBtn: document.getElementById('search-btn'),
  results: document.getElementById('results'),
  pagination: document.getElementById('pagination'),
  popularList: document.getElementById('popular-list'),
  recentList: document.getElementById('recent-list'),
  topratedList: document.getElementById('toprated-list')
};

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', async () => {
  // Load scroll sections
  loadSection('popular-list', 'followedCount');
  loadSection('recent-list', 'latestUploadedChapter');
  loadSection('toprated-list', 'rating');

  // Setup search
  setupEventListeners();
  
  // Default load popular manga
  await searchManga('popular'); 
});

// ===== SEARCH FUNCTIONS =====
function setupEventListeners() {
  elements.searchBtn.addEventListener('click', async () => {
    const query = elements.search.value.trim();
    if (query) await searchManga(query);
  });

  elements.search.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const query = elements.search.value.trim();
      if (query) await searchManga(query);
    }
  });
}

async function searchManga(query, page = 1) {
  try {
    currentSearch = query;
    currentPage = page;
    elements.results.innerHTML = '<div class="loading">Loading...</div>';

    const response = await fetch(`${API_BASE}/fetchMangaList?query=${encodeURIComponent(query)}&page=${page}`);
    const data = await response.json();
    displaySearchResults(data);
  } catch (error) {
    console.error('Search failed:', error);
    elements.results.innerHTML = `<div class="error-message">Search failed: ${error.message}</div>`;
  }
}

function displaySearchResults(data) {
  if (!data.data?.length) {
    elements.results.innerHTML = '<div class="no-results">No manga found</div>';
    return;
  }

  elements.results.innerHTML = data.data.map(manga => `
    <div class="manga-card" data-id="${manga.id}">
      <div class="manga-cover">
        <img src="/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl || '')}" 
             alt="${manga.attributes.title.en}" 
             onerror="this.src='placeholder.jpg'">
      </div>
      <div class="manga-title">${manga.attributes.title.en || 'Untitled'}</div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.manga-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `details.html?manga=${card.dataset.id}`;
    });
  });

  setupPagination(data.total);
}

// ===== SCROLL SECTIONS =====
async function loadSection(containerId, sortKey) {
  try {
    const container = document.getElementById(containerId);
    const res = await fetch(`${API_BASE}/fetchMangaList?sort=${sortKey}&limit=10`);
    const data = await res.json();

    container.innerHTML = data.data.map(manga => `
      <div class="manga-card" data-id="${manga.id}">
        <div class="cover-wrap">
          <img src="/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl || '')}" 
               loading="lazy" 
               onerror="this.src='placeholder.jpg'">
        </div>
        <p class="title">${manga.attributes.title.en || 'Untitled'}</p>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.manga-card').forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = `details.html?manga=${card.dataset.id}`;
      });
    });
  } catch (error) {
    console.error(`Failed to load ${containerId}:`, error);
  }
}

// ===== PAGINATION =====

function setupPagination(totalPages) {
  if (totalPages <= 1) {
    elements.pagination.innerHTML = '';
    return;
  }

  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  let paginationHTML = '';

  paginationHTML += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
    ${currentPage === 1 ? 'disabled' : `data-page="${currentPage - 1}"`}>&laquo;</button>`;

  if (start > 1) {
    paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) paginationHTML += `<span class="page-ellipsis">...</span>`;
  }

  for (let i = start; i <= end; i++) {
    paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) paginationHTML += `<span class="page-ellipsis">...</span>`;
    paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  paginationHTML += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
    ${currentPage === totalPages ? 'disabled' : `data-page="${currentPage + 1}"`}>&raquo;</button>`;

  elements.pagination.innerHTML = paginationHTML;

  document.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = parseInt(btn.dataset.page);
      if (page && page !== currentPage) {
        await searchManga(currentSearch, page);
      }
    });
  });
}

async function loadMangaDetails(mangaId) {
  try {
    elements.mangaDetails.classList.add('loading');
    elements.mangaDetails.classList.remove('hidden');
    elements.mangaList.classList.add('hidden');

    const response = await fetch(`${API_BASE}/fetchMangaDetails?id=${mangaId}`);
    if (!response.ok) throw new Error(`Manga details request failed with status ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    displayMangaDetails(data);
  } catch (error) {
    console.error('Failed to load manga details:', error);
    showError(`Failed to load manga details: ${error.message}`);
    showMangaList();
  }
}

function displayMangaDetails(data) {
  const manga = data.manga;
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
  const coverUrl = `/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl || 'placeholder.jpg')}`;

  document.title = `${title} - Manga Viewer`;
  elements.mangaTitle.textContent = title;
  elements.mangaCover.innerHTML = `<img src="${coverUrl}" alt="${title}" onerror="this.src='placeholder.jpg'">`;

  const authors = manga.relationships
    .filter(rel => rel.type === 'author' && rel.attributes?.name)
    .map(author => author.attributes.name).join(', ') || 'Unknown';

  const artists = manga.relationships
    .filter(rel => rel.type === 'artist' && rel.attributes?.name)
    .map(artist => artist.attributes.name).join(', ');

  elements.mangaAuthors.innerHTML = `
    <strong>Author${authors.includes(',') ? 's' : ''}:</strong> ${authors}
    ${artists && artists !== authors ? `<br><strong>Artist:</strong> ${artists}` : ''}
  `;

  const status = manga.attributes.status || 'Unknown';
  const demographic = manga.attributes.publicationDemographic || 'Unknown';
  elements.mangaStatus.innerHTML = `<strong>Status:</strong> ${capitalizeFirstLetter(status)}`;
  elements.mangaDemographic.innerHTML = `<strong>Demographic:</strong> ${capitalizeFirstLetter(demographic)}`;

  const desc = manga.attributes.description.en || Object.values(manga.attributes.description)[0] || 'No description available.';
  elements.mangaDescription.innerHTML = desc;

  displayChaptersList(data.volumes || {});
  elements.mangaDetails.classList.remove('loading');
}

function showMangaList() {
  elements.mangaList.classList.remove('hidden');
  elements.mangaDetails.classList.add('hidden');
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.body.insertBefore(errorDiv, document.body.firstChild);
  setTimeout(() => errorDiv.remove(), 5000);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
