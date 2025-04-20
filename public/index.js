const API_BASE = '/.netlify/functions';
let currentPage = 1;
let currentSearch = '';

// DOM Elements
const elements = {
  search: document.getElementById('search'),
  searchBtn: document.getElementById('search-btn'),
  results: document.getElementById('results'),
  pagination: document.getElementById('pagination')
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  // Load popular manga by default
  searchManga('popular');
});

// Event Listeners
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

// Search Functionality
async function searchManga(query, page = 1) {
  try {
    currentSearch = query;
    currentPage = page;
    elements.results.innerHTML = '<div class="loading">Loading results...</div>';

    const response = await fetch(`${API_BASE}/fetchMangaList?query=${encodeURIComponent(query)}&page=${page}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    displaySearchResults(data);
  } catch (error) {
    console.error('Search error:', error);
    elements.results.innerHTML = `<div class="error-message">Search failed: ${error.message}</div>`;
  }
}

// Display Results
function displaySearchResults(data) {
  if (!data.data || data.data.length === 0) {
    elements.results.innerHTML = '<div class="no-results">No manga found.</div>';
    elements.pagination.innerHTML = '';
    return;
  }

  // Render Manga Cards
  elements.results.innerHTML = data.data.map(manga => {
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
    const coverUrl = manga.coverUrl 
      ? `/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl)}`
      : 'placeholder.jpg';

    return `
      <div class="manga-card" data-id="${manga.id}">
        <div class="manga-cover">
          <img src="${coverUrl}" alt="${title}" onerror="this.src='placeholder.jpg'">
        </div>
        <div class="manga-title">${title}</div>
      </div>
    `;
  }).join('');

  // Add click handlers
  document.querySelectorAll('.manga-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `details.html?manga=${card.dataset.id}`;
    });
  });

  // Setup Pagination
  setupPagination(data.total);
}

// Pagination Logic
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
      ${currentPage === 1 ? 'disabled' : `onclick="window.searchManga('${currentSearch}', ${currentPage - 1})"`}>
      &laquo;
    </button>
  `;

  // First Page + Ellipsis
  if (start > 1) {
    paginationHTML += `
      <button class="page-btn" onclick="window.searchManga('${currentSearch}', 1)">1</button>
    `;
    if (start > 2) paginationHTML += `<span class="page-ellipsis">...</span>`;
  }

  // Page Numbers
  for (let i = start; i <= end; i++) {
    paginationHTML += `
      <button class="page-btn ${i === currentPage ? 'active' : ''}" 
        onclick="window.searchManga('${currentSearch}', ${i})">
        ${i}
      </button>
    `;
  }

  // Last Page + Ellipsis
  if (end < totalPages) {
    if (end < totalPages - 1) paginationHTML += `<span class="page-ellipsis">...</span>`;
    paginationHTML += `
      <button class="page-btn" onclick="window.searchManga('${currentSearch}', ${totalPages})">
        ${totalPages}
      </button>
    `;
  }

  // Next Button
  paginationHTML += `
    <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
      ${currentPage === totalPages ? 'disabled' : `onclick="window.searchManga('${currentSearch}', ${currentPage + 1})"`}>
      &raquo;
    </button>
  `;

  elements.pagination.innerHTML = paginationHTML;
}

// Make functions globally available
window.searchManga = searchManga;
