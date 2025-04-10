// Global variables
const API_BASE = '/.netlify/functions';
let currentPage = 1;
let currentSearch = '';

// DOM Elements
const elements = {
  search: document.getElementById('search'),
  searchBtn: document.getElementById('search-btn'),
  results: document.getElementById('results'),
  pagination: document.getElementById('pagination'),
  mangaList: document.getElementById('manga-list'),
  mangaDetails: document.getElementById('manga-details'),
  mangaCover: document.getElementById('manga-cover'),
  mangaTitle: document.getElementById('manga-title'),
  mangaAuthors: document.getElementById('manga-authors'),
  mangaStatus: document.getElementById('manga-status'),
  mangaDemographic: document.getElementById('manga-demographic'),
  mangaDescription: document.getElementById('manga-description'),
  chaptersList: document.getElementById('chapters-list'),
  backToSearch: document.getElementById('back-to-search')
};

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('manga');

// Initialize page based on URL parameters
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Set up event listeners
    setupEventListeners();
    
    if (mangaId) {
      // Load manga details if ID is in URL
      await loadMangaDetails(mangaId);
    } else {
      // Load popular manga as default
      await searchManga('popular');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Failed to initialize page: ${error.message}`);
  }
});

// Setup event listeners
function setupEventListeners() {
  // Search form submission
  elements.searchBtn.addEventListener('click', async () => {
    const query = elements.search.value.trim();
    if (query) {
      await searchManga(query);
    }
  });
  
  // Enter key in search box
  elements.search.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const query = elements.search.value.trim();
      if (query) {
        await searchManga(query);
      }
    }
  });
  
  // Back to search button
  elements.backToSearch.addEventListener('click', (e) => {
    e.preventDefault();
    showMangaList();
    
    // Update URL without mangaId
    const url = new URL(window.location.href);
    url.searchParams.delete('manga');
    window.history.pushState({}, '', url);
  });
}

// Function to search for manga
async function searchManga(query, page = 1) {
  try {
    currentSearch = query;
    currentPage = page;
    
    // Show loading state
    elements.results.innerHTML = '<div class="loading">Loading results...</div>';
    
    const response = await fetch(`${API_BASE}/fetchMangaList?query=${encodeURIComponent(query)}&page=${page}`);
    
    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Display results
    displaySearchResults(data);
    
    // Show manga list view
    showMangaList();
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('manga');
    window.history.pushState({}, '', url);
    
  } catch (error) {
    console.error('Search error:', error);
    elements.results.innerHTML = `<div class="error-message">Search failed: ${error.message}</div>`;
  }
}

// Function to display search results
function displaySearchResults(data) {
  if (!data.data || data.data.length === 0) {
    elements.results.innerHTML = '<div class="no-results">No manga found. Try different search terms.</div>';
    elements.pagination.innerHTML = '';
    return;
  }
  
  // Create manga cards
  const mangaCards = data.data.map(manga => {
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
    const coverUrl = manga.coverUrl || 'placeholder.jpg'; // Use our pre-processed cover URL
    
    return `
      <div class="manga-card" data-id="${manga.id}">
        <div class="manga-cover">
          <img src="${coverUrl}" alt="${title}" onerror="this.src='placeholder.jpg'">
        </div>
        <div class="manga-title">${title}</div>
      </div>
    `;
  }).join('');
  
  elements.results.innerHTML = mangaCards;
  
  // Add click event listeners to manga cards
  document.querySelectorAll('.manga-card').forEach(card => {
    card.addEventListener('click', async () => {
      const id = card.dataset.id;
      await loadMangaDetails(id);
      
      // Update URL with mangaId
      const url = new URL(window.location.href);
      url.searchParams.set('manga', id);
      window.history.pushState({}, '', url);
    });
  });
  
  // Setup pagination
  const totalPages = Math.ceil(data.total / 20);
  setupPagination(totalPages);
}

// Function to setup pagination
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
  
  // Previous button
  paginationHTML += `
    <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
      ${currentPage === 1 ? 'disabled' : `data-page="${currentPage - 1}"`}>
      &laquo;
    </button>
  `;
  
  // First page
  if (start > 1) {
    paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }
  }
  
  // Page numbers
  for (let i = start; i <= end; i++) {
    paginationHTML += `
      <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }
  
  // Last page
  if (end < totalPages) {
    if (end < totalPages - 1) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }
  
  // Next button
  paginationHTML += `
    <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
      ${currentPage === totalPages ? 'disabled' : `data-page="${currentPage + 1}"`}>
      &raquo;
    </button>
  `;
  
  elements.pagination.innerHTML = paginationHTML;
  
  // Add click event listeners to page buttons
  document.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = parseInt(btn.dataset.page);
      if (page && page !== currentPage) {
        await searchManga(currentSearch, page);
      }
    });
  });
}

// Function to load manga details
async function loadMangaDetails(mangaId) {
  try {
    // Show loading state
    elements.mangaDetails.classList.add('loading');
    elements.mangaDetails.classList.remove('hidden');
    elements.mangaList.classList.add('hidden');
    
    const response = await fetch(`${API_BASE}/fetchMangaDetails?id=${mangaId}`);
    
    if (!response.ok) {
      throw new Error(`Manga details request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Display manga details
    displayMangaDetails(data);
    
  } catch (error) {
    console.error('Failed to load manga details:', error);
    showError(`Failed to load manga details: ${error.message}`);
    showMangaList();
  }
}

// Function to display manga details
function displayMangaDetails(data) {
  try {
    const manga = data.manga;
    const volumes = data.volumes || {};
    
    // Set title and cover
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
    document.title = `${title} - Manga Viewer`;
    elements.mangaTitle.textContent = title;
    
    // Set cover image
    const coverUrl = manga.coverUrl || 'placeholder.jpg';
    elements.mangaCover.innerHTML = `<img src="${coverUrl}" alt="${title}" onerror="this.src='placeholder.jpg'">`;
    
    // Set metadata
    // Find authors and artists
    const authors = manga.relationships
      .filter(rel => rel.type === 'author' && rel.attributes && rel.attributes.name)
      .map(author => author.attributes.name)
      .join(', ');
    
    const artists = manga.relationships
      .filter(rel => rel.type === 'artist' && rel.attributes && rel.attributes.name)
      .map(artist => artist.attributes.name)
      .join(', ');
    
    elements.mangaAuthors.innerHTML = `
      <strong>Author${authors.includes(',') ? 's' : ''}:</strong> ${authors || 'Unknown'}
      ${artists && artists !== authors ? `<br><strong>Artist${artists.includes(',') ? 's' : ''}:</strong> ${artists}` : ''}
    `;
    
    // Set status and demographic
    const status = manga.attributes.status ? capitalizeFirstLetter(manga.attributes.status) : 'Unknown';
    const demographic = manga.attributes.publicationDemographic ? 
      capitalizeFirstLetter(manga.attributes.publicationDemographic) : 'Unknown';
    
    elements.mangaStatus.innerHTML = `<strong>Status:</strong> ${status}`;
    elements.mangaDemographic.innerHTML = `<strong>Demographic:</strong> ${demographic}`;
    
    // Set description
    const description = manga.attributes.description.en || 
      Object.values(manga.attributes.description)[0] || 
      'No description available.';
    
    elements.mangaDescription.innerHTML = description;
    
    // Display chapters list
    displayChaptersList(volumes);
    
    // Show manga details view
    elements.mangaDetails.classList.remove('loading');
    elements.mangaList.classList.add('hidden');
    elements.mangaDetails.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error displaying manga details:', error);
    showError(`Error displaying manga details: ${error.message}`);
  }
}

// Function to display chapters list
function displayChaptersList(volumes) {
  try {
    if (!volumes || Object.keys(volumes).length === 0) {
      elements.chaptersList.innerHTML = '<div class="no-chapters">No chapters available.</div>';
      return;
    }
    
    // Get volume keys and sort them
    const volumeKeys = Object.keys(volumes);
    
    // Generate HTML for chapters list
    elements.chaptersList.innerHTML = volumeKeys.map(vol => `
      <div class="volume-section">
        <h4 class="volume-title">${vol === 'No Volume' ? 'Chapters' : `Volume ${vol}`}</h4>
        <div class="volume-chapters">
          ${volumes[vol].map(chapter => {
            return `
              <div class="chapter-item">
                <div class="chapter-info">
                  <a href="reader.html?manga=${mangaId}&chapter=${chapter.id}" class="chapter-link">
                    <strong>${chapter.chapter === 'No Chapter' ? 'Oneshot' : `Chapter ${chapter.chapter}`}</strong>
                    ${chapter.title ? `<span class="chapter-title">${chapter.title}</span>` : ''}
                  </a>
                  <div class="chapter-group">${chapter.groupName}</div>
                </div>
                <div class="chapter-actions">
                  <a href="reader.html?manga=${mangaId}&chapter=${chapter.id}" class="btn read-btn">Read</a>
                  <a href="https://mangadex.org/chapter/${chapter.id}" target="_blank" class="btn md-btn">MD</a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error displaying chapters list:', error);
    elements.chaptersList.innerHTML = `<div class="error-message">Failed to load chapters list: ${error.message}</div>`;
  }
}

// Helper function to show manga list view
function showMangaList() {
  elements.mangaList.classList.remove('hidden');
  elements.mangaDetails.classList.add('hidden');
}

// Helper function to show errors
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  // Add error to page
  document.body.insertBefore(errorDiv, document.body.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
