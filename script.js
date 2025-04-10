// Global variables
const API_BASE = '/.netlify/functions';
let currentPage = 1;

// DOM Elements
const elements = {
  search: document.getElementById('search'),
  results: document.getElementById('results'),
  mangaDetails: document.getElementById('manga-details'),
  chaptersList: document.getElementById('chapters-list'),
  chapterPages: document.getElementById('chapter-pages'),
  pageIndicator: document.getElementById('page-indicator'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  backBtn: document.getElementById('back-btn'),
  mdLink: document.getElementById('md-link'),
  mdFallback: document.querySelector('.md-fallback')
};

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('manga');
const chapterId = urlParams.get('chapter');

// Initialize page based on URL parameters
window.addEventListener('DOMContentLoaded', async () => {
  try {
    if (chapterId) {
      // We're in reader mode
      if (elements.mdFallback) {
        elements.mdFallback.style.display = 'none'; // Hide initially until we know we need it
      }
      
      await loadChapterPages(chapterId);
      setupPagination();
      
      if (mangaId) {
        elements.backBtn.href = `details.html?manga=${mangaId}`;
      } else {
        elements.backBtn.href = 'index.html';
      }
    } else if (mangaId) {
      // We're on a manga details page - redirect to details.html
      window.location.href = `details.html?manga=${mangaId}`;
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Failed to initialize page: ${error.message}`);
  }
});

// Function to load chapter pages
async function loadChapterPages(chapterId) {
  try {
    // First, get chapter data to display title and navigation info
    const chapterResponse = await fetch(`${API_BASE}/fetchChapterData?id=${chapterId}`);
    
    if (!chapterResponse.ok) {
      throw new Error(`Chapter data request failed with status ${chapterResponse.status}`);
    }
    
    const chapterData = await chapterResponse.json();
    
    if (chapterData.error) {
      throw new Error(chapterData.error);
    }
    
    // Set page title
    const chapterTitle = chapterData.chapter?.title || `Chapter ${chapterData.chapter?.chapter || ''}`;
    document.title = `${chapterTitle} - MangaViewer`;
    
    // Add chapter title to the UI if needed
    const titleElement = document.createElement('h2');
    titleElement.className = 'chapter-title';
    titleElement.textContent = chapterTitle;
    elements.chapterPages.parentNode.insertBefore(titleElement, elements.chapterPages);
    
    // Next, get chapter pages with data-saver for smaller file sizes
    const pagesResponse = await fetch(`${API_BASE}/fetchChapterPages?id=${chapterId}&dataSaver=true`);
    
    if (!pagesResponse.ok) {
      throw new Error(`Chapter pages request failed with status ${pagesResponse.status}`);
    }
    
    const pagesData = await pagesResponse.json();
    
    // Setup external link fallback
    if (pagesData.externalUrl && elements.mdLink) {
      elements.mdLink.href = pagesData.externalUrl;
    }
    
    // Check for errors or missing data
    if (pagesData.error || !pagesData.pageUrls || pagesData.pageUrls.length === 0) {
      throw new Error(pagesData.error || 'No pages found for this chapter');
    }
    
    // Setup the viewer
    window.chapterPages = pagesData.pageUrls;
    window.totalPages = pagesData.pageUrls.length;
    
    // Display the first page
    displayPage(1);
    
    // Update page counter
    elements.pageIndicator.textContent = `Page 1 / ${pagesData.pageUrls.length}`;
    
  } catch (error) {
    console.error('Failed to load chapter:', error);
    showError(`Failed to load chapter: ${error.message}`);
    
    // Show MangaDex fallback link
    if (elements.mdFallback) {
      elements.mdFallback.style.display = 'block';
    }
  }
}

// Function to display a specific page
function displayPage(pageNum) {
  try {
    if (!window.chapterPages || pageNum < 1 || pageNum > window.chapterPages.length) {
      return;
    }
    
    currentPage = pageNum;
    elements.chapterPages.innerHTML = '';
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = 'Loading page...';
    elements.chapterPages.appendChild(loadingDiv);
    
    const img = new Image();
    
    // Set up onload handler before setting src
    img.onload = () => {
      elements.chapterPages.innerHTML = ''; // Clear loading indicator
      img.className = 'manga-page';
      elements.chapterPages.appendChild(img);
      elements.pageIndicator.textContent = `Page ${pageNum} / ${window.totalPages}`;
    };
    
    img.onerror = () => {
      elements.chapterPages.innerHTML = '';
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-state';
      errorDiv.innerHTML = `
        <p>Failed to load page ${pageNum}. This might be due to CORS restrictions or API changes.</p>
        <p>You can try the following:</p>
        <a href="javascript:void(0)" onclick="retryPage(${pageNum})">Retry</a>
        <a href="${elements.mdLink.href}" target="_blank">Read on MangaDex</a>
      `;
      elements.chapterPages.appendChild(errorDiv);
      
      // Show MangaDex fallback link
      if (elements.mdFallback) {
        elements.mdFallback.style.display = 'block';
      }
      
      console.error(`Failed to load image for page ${pageNum}`);
    };
    
    // Now set the source
    img.src = window.chapterPages[pageNum - 1];
    img.alt = `Page ${pageNum}`;
    
    // Update UI state
    elements.prevPageBtn.disabled = pageNum <= 1;
    elements.nextPageBtn.disabled = pageNum >= window.chapterPages.length;
    
    // Update browser history without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNum);
    window.history.replaceState({}, '', url);
    
  } catch (error) {
    console.error('Error displaying page:', error);
    showError(`Failed to display page ${pageNum}: ${error.message}`);
  }
}

// Function to retry loading a page
window.retryPage = function(pageNum) {
  displayPage(pageNum);
};

// Setup pagination controls
function setupPagination() {
  elements.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      displayPage(currentPage - 1);
    }
  });
  
  elements.nextPageBtn.addEventListener('click', () => {
    if (window.chapterPages && currentPage < window.chapterPages.length) {
      displayPage(currentPage + 1);
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') {
      elements.prevPageBtn.click();
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      elements.nextPageBtn.click();
    }
  });
  
  // Touch navigation for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
      // Swipe left, go to next page
      elements.nextPageBtn.click();
    } else if (touchEndX > touchStartX + 50) {
      // Swipe right, go to previous page
      elements.prevPageBtn.click();
    }
  }
  
  // Check if there's a page parameter in the URL
  const pageParam = urlParams.get('page');
  if (pageParam && !isNaN(parseInt(pageParam))) {
    displayPage(parseInt(pageParam));
  }
}

// Helper function to show errors
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  // Find a good place to show the error
  if (elements.chapterPages && elements.chapterPages.innerHTML === '') {
    elements.chapterPages.appendChild(errorDiv);
  } else {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
  
  // Show MangaDex fallback
  if (elements.mdFallback) {
    elements.mdFallback.style.display = 'block';
  }
}
