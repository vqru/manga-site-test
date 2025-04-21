const API_BASE = '/.netlify/functions';
let currentPage = 1;
let currentSearch = '';

const elements = {
  search: document.getElementById('search'),
  searchBtn: document.getElementById('search-btn'),
  results: document.getElementById('results'),
  pagination: document.getElementById('pagination'),
  searchResults: document.getElementById('search-results'),
  popularList: document.getElementById('popular-list'),
  recentList: document.getElementById('recent-list'),
  topratedList: document.getElementById('toprated-list')
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAllCategories();
});

// Load all category sections
async function loadAllCategories() {
  await Promise.all([
    loadSection('popular-list', 'followedCount'),
    loadSection('recent-list', 'latestUploadedChapter'),
    loadSection('toprated-list', 'rating')
  ]);
}

// Category loading
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

// Search functionality
function setupEventListeners() {
  elements.searchBtn.addEventListener('click', handleSearch);
  elements.search.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

async function handleSearch() {
  const query = elements.search.value.trim();
  if (!query) {
    // Show categories if search is empty
    document.querySelectorAll('.manga-row').forEach(el => el.style.display = 'block');
    elements.searchResults.style.display = 'none';
    return;
  }

  try {
    // Hide categories during search
    document.querySelectorAll('.manga-row').forEach(el => el.style.display = 'none');
    elements.searchResults.style.display = 'block';
    
    currentSearch = query;
    currentPage = 1;
    elements.results.innerHTML = '<div class="loading">Loading results...</div>';

    const response = await fetch(`${API_BASE}/fetchMangaList?query=${encodeURIComponent(query)}&page=${currentPage}`);
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const data = await response.json();
    
    displaySearchResults(data);
  } catch (error) {
    console.error('Search error:', error);
    elements.results.innerHTML = `<div class="error-message">Search failed: ${error.message}</div>`;
  }
}

function displaySearchResults(data) {
  if (!data.data?.length) {
    elements.results.innerHTML = '<div class="no-results">No manga found</div>';
    elements.pagination.innerHTML = '';
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

// Pagination
function setupPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / 20);
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

  // Previous Button
  paginationHTML += `
    <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
      ${currentPage === 1 ? 'disabled' : `onclick="window.handlePagination(${currentPage - 1})"`}>
      &laquo;
    </button>
  `;

  // First Page + Ellipsis
  if (start > 1) {
    paginationHTML += `
      <button class="page-btn" onclick="window.handlePagination(1)">1</button>
    `;
    if (start > 2) paginationHTML += `<span class="page-ellipsis">...</span>`;
  }

  // Page Numbers
  for (let i = start; i <= end; i++) {
    paginationHTML += `
      <button class="page-btn ${i === currentPage ? 'active' : ''}" 
        onclick="window.handlePagination(${i})">
        ${i}
      </button>
    `;
  }

  // Last Page + Ellipsis
  if (end < totalPages) {
    if (end < totalPages - 1) paginationHTML += `<span class="page-ellipsis">...</span>`;
    paginationHTML += `
      <button class="page-btn" onclick="window.handlePagination(${totalPages})">
        ${totalPages}
      </button>
    `;
  }

  // Next Button
  paginationHTML += `
    <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
      ${currentPage === totalPages ? 'disabled' : `onclick="window.handlePagination(${currentPage + 1})"`}>
      &raquo;
    </button>
  `;

  elements.pagination.innerHTML = paginationHTML;
}

// Global functions
window.handlePagination = async (page) => {
  currentPage = page;
  await handleSearch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.handleSearch = handleSearch;
