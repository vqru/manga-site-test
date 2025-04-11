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
      // We're on a manga details page - just load the data, do NOT redirect
      await loadMangaDetails(mangaId);
    }

  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Failed to initialize page: ${error.message}`);
  }
});

// Function to load chapter pages
async function loadChapterPages(chapterId) {
  try {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-container';
    loadingElement.innerHTML = '<div class="loading-spinner"></div><p>Loading chapter...</p>';
    elements.chapterPages.appendChild(loadingElement);

    const chapterResponse = await fetch(`${API_BASE}/fetchChapterData?id=${chapterId}`);
    if (!chapterResponse.ok) throw new Error(`Chapter data request failed with status ${chapterResponse.status}`);
    const chapterData = await chapterResponse.json();
    if (chapterData.error) throw new Error(chapterData.error);

    const chapterTitle = chapterData.chapter?.title || `Chapter ${chapterData.chapter?.chapter || ''}`;
    document.title = `${chapterTitle} - MangaViewer`;

    const titleElement = document.querySelector('.chapter-title') || document.createElement('h2');
    titleElement.className = 'chapter-title';
    titleElement.textContent = chapterTitle;
    if (!document.querySelector('.chapter-title')) {
      elements.chapterPages.parentNode.insertBefore(titleElement, elements.chapterPages);
    }

    const pagesResponse = await fetch(`${API_BASE}/fetchChapterPages?id=${chapterId}&dataSaver=true`);
    if (!pagesResponse.ok) throw new Error(`Chapter pages request failed with status ${pagesResponse.status}`);
    const pagesData = await pagesResponse.json();

    elements.chapterPages.innerHTML = '';

    if (pagesData.externalUrl && elements.mdLink) {
      elements.mdLink.href = pagesData.externalUrl;
    }

    if (pagesData.error || !pagesData.pageUrls || pagesData.pageUrls.length === 0) {
      throw new Error(pagesData.error || 'No pages found for this chapter');
    }

    window.chapterPages = pagesData.pageUrls;
    window.proxiedPages = pagesData.proxiedPageUrls || pagesData.pageUrls;
    window.totalPages = pagesData.pageUrls.length;
    useProxyByDefault = pagesData.useProxy === true;

    displayPage(1);
    elements.pageIndicator.textContent = `Page 1 / ${pagesData.pageUrls.length}`;

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

    if (elements.mdFallback) {
      elements.mdFallback.style.display = 'block';
    }
  }
}

// Function to display a specific page
function displayPage(pageNum) {
  try {
    if (!window.chapterPages || pageNum < 1 || pageNum > window.chapterPages.length) return;

    currentPage = pageNum;
    elements.chapterPages.innerHTML = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div><p>Loading page...</p>';
    elements.chapterPages.appendChild(loadingDiv);

    const img = new Image();

    if (!loadAttempts[pageNum]) loadAttempts[pageNum] = 0;
    loadAttempts[pageNum]++;
    const currentAttempt = loadAttempts[pageNum];

    img.onload = () => {
      if (currentAttempt === loadAttempts[pageNum]) {
        elements.chapterPages.innerHTML = '';
        img.className = 'manga-page';
        elements.chapterPages.appendChild(img);
        elements.pageIndicator.textContent = `Page ${pageNum} / ${window.totalPages}`;
      }
    };

    img.onerror = () => {
      if (currentAttempt === loadAttempts[pageNum]) {
        console.error(`Failed to load image for page ${pageNum}`);
        if (useProxyByDefault && window.proxiedPages[pageNum - 1] === img.src) {
          tryDirectUrl(pageNum);
        } else if (!useProxyByDefault && window.chapterPages[pageNum - 1] === img.src) {
          tryProxyUrl(pageNum);
        } else {
          showPageError(pageNum);
        }
      }
    };

    let initialUrl = useProxyByDefault && window.proxiedPages
      ? window.proxiedPages[pageNum - 1]
      : window.chapterPages[pageNum - 1];

    img.src = initialUrl;
    img.alt = `Page ${pageNum}`;

    elements.prevPageBtn.disabled = pageNum <= 1;
    elements.nextPageBtn.disabled = pageNum >= window.chapterPages.length;

    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNum);
    window.history.replaceState({}, '', url);

  } catch (error) {
    console.error('Error displaying page:', error);
    showError(`Failed to display page ${pageNum}: ${error.message}`);
  }
}

function tryDirectUrl(pageNum) {
  const img = new Image();
  img.onload = () => {
    elements.chapterPages.innerHTML = '';
    img.className = 'manga-page';
    elements.chapterPages.appendChild(img);
    useProxyByDefault = false;
  };
  img.onerror = () => showPageError(pageNum);
  img.src = window.chapterPages[pageNum - 1];
  img.alt = `Page ${pageNum}`;
}

function tryProxyUrl(pageNum) {
  const img = new Image();
  img.onload = () => {
    elements.chapterPages.innerHTML = '';
    img.className = 'manga-page';
    elements.chapterPages.appendChild(img);
    useProxyByDefault = true;
  };
  img.onerror = () => showPageError(pageNum);
  img.src = window.proxiedPages[pageNum - 1];
  img.alt = `Page ${pageNum}`;
}

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
  if (elements.mdFallback) {
    elements.mdFallback.style.display = 'block';
  }
}

window.toggleLoadingMethod = function () {
  useProxyByDefault = !useProxyByDefault;
  displayPage(currentPage);
};

window.retryPage = function (pageNum) {
  loadAttempts[pageNum] = 0;
  displayPage(pageNum);
};

function setupPagination() {
  elements.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) displayPage(currentPage - 1);
  });

  elements.nextPageBtn.addEventListener('click', () => {
    if (window.chapterPages && currentPage < window.chapterPages.length) {
      displayPage(currentPage + 1);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') elements.prevPageBtn.click();
    else if (e.key === 'ArrowRight' || e.key === 'd') elements.nextPageBtn.click();
  });

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
    if (touchEndX < touchStartX - 50) elements.nextPageBtn.click();
    else if (touchEndX > touchStartX + 50) elements.prevPageBtn.click();
  }

  const pageParam = urlParams.get('page');
  if (pageParam && !isNaN(parseInt(pageParam))) {
    displayPage(parseInt(pageParam));
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  if (elements.chapterPages && elements.chapterPages.innerHTML === '') {
    elements.chapterPages.appendChild(errorDiv);
  } else {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }

  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry Loading';
  retryBtn.className = 'retry-btn';
  retryBtn.addEventListener('click', () => {
    location.reload();
  });
  errorDiv.appendChild(retryBtn);

  if (elements.mdFallback) {
    elements.mdFallback.style.display = 'block';
  }
}
