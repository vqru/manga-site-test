// Global variables
const API_BASE = '/.netlify/functions';
let currentPage = 1;
let loadAttempts = {};
let useProxyByDefault = true;

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
    // Show loading state
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-container';
    loadingElement.innerHTML = '<div class="loading-spinner"></div><p>Loading chapter...</p>';
    elements.chapterPages.appendChild(loadingElement);

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
    const titleElement = document.querySelector('.chapter-title') || document.createElement('h2');
    titleElement.className = 'chapter-title';
    titleElement.textContent = chapterTitle;
    if (!document.querySelector('.chapter-title')) {
      elements.chapterPages.parentNode.insertBefore(titleElement, elements.chapterPages);
    }
    
    // Next, get chapter pages with data-saver for smaller file sizes
    const pagesResponse = await fetch(`${API_BASE}/fetchChapterPages?id=${chapterId}&dataSaver=true`);
    
    if (!pagesResponse.ok) {
      throw new Error(`Chapter pages request failed with status ${pagesResponse.status}`);
    }
    
    const pagesData = await pagesResponse.json();
    
    // Clear loading state
    elements.chapterPages.innerHTML = '';
    
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
    window.proxiedPages = pagesData.proxiedPageUrls || pagesData.pageUrls;
    window.totalPages = pagesData.pageUrls.length;
    useProxyByDefault = pagesData.useProxy === true;
    
    // Display the first page
    displayPage(1);
    
    // Update page counter
    elements.pageIndicator.textContent = `Page 1 / ${pagesData.pageUrls.length}`;
    
    // Add reload button in case of issues
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Reload Chapter';
    reloadBtn.className = 'reload-btn';
    reloadBtn.addEventListener('click', () => {
      loadChapterPages(chapterId);
    });
    elements.chapterPages.parentNode.appendChild(reloadBtn);
    
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
    loadingDiv.innerHTML = '<div class="loading-spinner"></div><p>Loading page...</p>';
    elements.chapterPages.appendChild(loadingDiv);
    
    const img = new Image();
    
    // Track which loading attempt this is for this page
    if (!loadAttempts[pageNum]) {
      loadAttempts[pageNum] = 0;
    }
    loadAttempts[pageNum]++;
    const currentAttempt = loadAttempts[pageNum];
    
    // Set up onload handler before setting src
    img.onload = () => {
      // Only update if this is still the current attempt
      if (currentAttempt === loadAttempts[pageNum]) {
        elements.chapterPages.innerHTML = ''; // Clear loading indicator
        img.className = 'manga-page';
        elements.chapterPages.appendChild(img);
        elements.pageIndicator.textContent = `Page ${pageNum} / ${window.totalPages}`;
      }
    };
    
    img.onerror = () => {
      // Only handle error if this is still the current attempt
      if (currentAttempt === loadAttempts[pageNum]) {
        console.error(`Failed to load image for page ${pageNum}`);
        
        // Decide what to do based on the current state
        if (useProxyByDefault && window.proxiedPages && window.proxiedPages[pageNum - 1] === img.src) {
          // Already using proxy and failed, try direct URL
          tryDirectUrl(pageNum);
        } else if (!useProxyByDefault && window.chapterPages && window.chapterPages[pageNum - 1] === img.src) {
          // Using direct URL and failed, try proxy
          tryProxyUrl(pageNum);
        } else {
          // Both methods failed, show error
          showPageError(pageNum);
        }
      }
    };
    
    // Determine initial URL to try
    let initialUrl;
    if (useProxyByDefault && window.proxiedPages) {
      initialUrl = window.proxiedPages[pageNum - 1];
    } else {
      initialUrl = window.chapterPages[pageNum - 1];
    }
    
    // Now set the source
    img.src = initialUrl;
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

// Try to load with direct URL when proxy fails
function tryDirectUrl(pageNum) {
  const img = new Image();
  img.onload = () => {
    elements.chapterPages.innerHTML = '';
    img.className = 'manga-page';
    elements.chapterPages.appendChild(img);
    
    // Direct URL worked, use this method for future pages
    useProxyByDefault = false;
  };
  
  img.onerror = () => {
    showPageError(pageNum);
  };
  
  img.src = window.chapterPages[pageNum - 1];
  img.alt = `Page ${pageNum}`;
}

// Try to load with proxy URL when direct fails
function tryProxyUrl(pageNum) {
  const img = new Image();
  img.onload = () => {
    elements.chapterPages.innerHTML = '';
    img.className = 'manga-page';
    elements.chapterPages.appendChild(img);
    
    // Proxy URL worked, use this method for future pages
    useProxyByDefault = true;
  };
  
  img.onerror = () => {
    showPageError(pageNum);
  };
  
  img.src = window.proxiedPages[pageNum - 1];
  img.alt = `Page ${pageNum}`;
}

// Show page error state
function showPageError(pageNum) {
  elements.chapterPages.innerHTML = '';
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-state';
  errorDiv.innerHTML = `
    <p>Failed to load page ${pageNum}. This might be due to CORS restrictions or API changes.</p>
    <p>You can try the following:</p>
    <div class="error-actions">
      <button onclick="retryPage(${pageNum})">Retry Page</button>
      <button onclick="toggleLoadingMethod()">Try Different Method</button>
      <a href="${elements.mdLink.href}" target="_blank" class="md-button">Read on MangaDex</a>
    </div>
  `;
  elements.chapterPages.appendChild(errorDiv);
  
  // Show MangaDex fallback link
  if (elements.mdFallback) {
    elements.mdFallback.style.display = 'block';
  }
}

// Toggle between proxy and direct loading
window.toggleLoadingMethod = function() {
  useProxyByDefault = !useProxyByDefault;
  displayPage(currentPage);
};

// Function to retry loading a page
window.retryPage = function(pageNum) {
  // Reset attempt counter to force a fresh load
  loadAttempts[pageNum] = 0;
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
  
  // Add retry button
  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry Loading';
  retryBtn.className = 'retry-btn';
  retryBtn.addEventListener('click', () => {
    location.reload();
  });
  errorDiv.appendChild(retryBtn);
  
  // Show MangaDex fallback
  if (elements.mdFallback) {
    elements.mdFallback.style.display = 'block';
  }
}

// Add some CSS to improve the loading indicators
const style = document.createElement('style');
style.textContent = `
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }
  
  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-state {
    text-align: center;
    padding: 20px;
    background-color: #f8f8f8;
    border-radius: 8px;
    margin: 20px 0;
  }
  
  .error-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-top: 15px;
  }
  
  .error-actions button,
  .error-actions a {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  
  .error-actions button {
    background-color: #f0f0f0;
    border: 1px solid #ddd;
  }
  
  .md-button {
    background-color: #ff6740;
    color: white;
    text-decoration: none;
  }
  
  .reload-btn, .retry-btn {
    padding: 8px 16px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin: 10px 0;
    font-weight: bold;
  }
`;
document.head.appendChild(style);
