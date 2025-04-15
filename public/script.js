// Global variables
const API_BASE = '/.netlify/functions';
let currentPage = 1;
let loadAttempts = {};
let useProxyByDefault = true;
let isVerticalMode = false;
let mangaParkImages = [];
let mangaParkSource = '';

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
  mdFallback: document.querySelector('.md-fallback'),
  mangaCover: document.getElementById('manga-cover'),
  mangaTitle: document.getElementById('manga-title'),
  mangaAuthors: document.getElementById('manga-authors'),
  mangaStatus: document.getElementById('manga-status'),
  mangaDemographic: document.getElementById('manga-demographic'),
  mangaDescription: document.getElementById('manga-description'),
  verticalToggle: document.getElementById('vertical-toggle'),
  fallbackMangaPark: document.getElementById('fallback-mangapark')
};

// Initialize the page
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('popular-list')) {
    loadSection('popular-list', 'followedCount');
    loadSection('recent-list', 'latestUploadedChapter');
    loadSection('toprated-list', 'rating');
    loadSection('new-list', 'createdAt');
  }

  const urlParams = new URLSearchParams(window.location.search);
  const mangaId = urlParams.get('manga');
  const chapterId = urlParams.get('chapter');

  try {
    if (chapterId) {
      if (elements.mdFallback) elements.mdFallback.style.display = 'none';
      loadChapterPages(chapterId);
      setupPagination();
      setupReaderControls();
      elements.backBtn.href = mangaId ? `details.html?manga=${mangaId}` : 'index.html';
    } else if (mangaId) {
      loadMangaDetails(mangaId);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Failed to initialize page: ${error.message}`);
  }
});

// ---- HOMEPAGE SECTION LOGIC ----
async function loadSection(containerId, sortKey) {
  try {
    const res = await fetch(`${API_BASE}/fetchMangaList?sort=${sortKey}`);
    const json = await res.json();
    const container = document.getElementById(containerId);
    if (!json.data || !Array.isArray(json.data)) return;

    json.data.forEach(manga => {
      const card = createMangaCard(manga);
      container.appendChild(card);
    });
  } catch (error) {
    console.error(`Failed to load section ${containerId}:`, error);
  }
}

function createMangaCard(manga) {
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'No Title';
  const coverUrl = manga.coverUrl
    ? `/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl)}`
    : 'placeholder.jpg';

  const card = document.createElement('div');
  card.className = 'manga-card';
  card.innerHTML = `
    <div class="cover-wrap">
      <img src="${coverUrl}" alt="${title}" loading="lazy" onerror="this.src='placeholder.jpg'">
    </div>
    <p class="title">${title}</p>
  `;

  card.addEventListener('click', () => {
    window.location.href = `details.html?manga=${manga.id}`;
  });

  return card;
}

// ---- DETAILS PAGE / READER LOGIC ----
async function loadMangaDetails(mangaId) {
  try {
    const response = await fetch(`${API_BASE}/fetchMangaDetails?id=${mangaId}`);
    if (!response.ok) throw new Error(`Failed to fetch manga details`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    displayMangaDetails(data);
  } catch (error) {
    console.error('Error loading manga:', error);
    showError(`Error loading manga: ${error.message}`);
  }
}

function displayMangaDetails(data) {
  const manga = data.manga;
  const volumes = data.volumes || {};
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
  const coverUrl = `/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl || '')}`;
  document.title = `${title} - Manga Viewer`;
  elements.mangaTitle.textContent = title;
  elements.mangaCover.innerHTML = `<img src="${coverUrl}" alt="${title}" onerror="this.src='placeholder.jpg'">`;
  elements.mangaAuthors.textContent = manga.relationships?.find(r => r.type === 'author')?.attributes?.name || 'Unknown';
  elements.mangaStatus.textContent = manga.attributes.status || 'Unknown';
  elements.mangaDemographic.textContent = manga.attributes.publicationDemographic || 'Unknown';

  const descriptionText = manga.attributes.description?.en || 'No description.';
  elements.mangaDescription.innerHTML = `<div class="manga-description clickable">${descriptionText}</div>`;

  const descBox = elements.mangaDescription.querySelector('.manga-description');
  if (descBox) {
    descBox.addEventListener('click', () => {
      descBox.classList.toggle('expanded');
    });
  }

  displayChaptersList(volumes);
}

function displayChaptersList(volumes) {
  try {
    if (!volumes || Object.keys(volumes).length === 0) {
      elements.chaptersList.innerHTML = '<div class="no-chapters">No chapters available.</div>';
      return;
    }

    const volumeKeys = Object.keys(volumes);
    elements.chaptersList.innerHTML = volumeKeys.map(vol => `
      <div class="volume-section">
        <h4 class="volume-title">${vol === 'No Volume' ? 'Chapters' : `Volume ${vol}`}</h4>
        <div class="volume-chapters">
          ${volumes[vol].map(chapter => `
            <div class="chapter-item">
              <div class="chapter-info">
                <a href="reader.html?manga=${mangaId}&chapter=${chapter.id}" class="chapter-link">
                  <strong>${chapter.chapter === 'No Chapter' ? 'Oneshot' : `Chapter ${chapter.chapter}`}</strong>
                  ${chapter.title ? `<span class="chapter-title">${chapter.title}</span>` : ''}
                </a>
                <div class="chapter-group">${chapter.groupName || ''}</div>
              </div>
              <div class="chapter-actions">
                <a href="reader.html?manga=${mangaId}&chapter=${chapter.id}" class="btn read-btn">Read</a>
                <a href="https://mangadex.org/chapter/${chapter.id}" target="_blank" class="btn md-btn">MD</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error displaying chapters list:', error);
    elements.chaptersList.innerHTML = `<div class="error-message">Failed to load chapters list: ${error.message}</div>`;
  }
}

// ---- READER FUNCTIONS ----
async function loadChapterPages(chapterId) {
  try {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-container';
    loadingElement.innerHTML = '<div class="loading-spinner"></div><p>Loading chapter...</p>';
    elements.chapterPages.appendChild(loadingElement);

    const chapterResponse = await fetch(`${API_BASE}/fetchChapterData?id=${chapterId}`);
    if (!chapterResponse.ok) throw new Error(`Chapter data request failed`);
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
    if (!pagesResponse.ok) throw new Error(`Chapter pages request failed`);
    const pagesData = await pagesResponse.json();

    elements.chapterPages.innerHTML = '';
    if (pagesData.externalUrl && elements.mdLink) elements.mdLink.href = pagesData.externalUrl;
    if (pagesData.error || !pagesData.pageUrls?.length) throw new Error(pagesData.error || 'No pages');

    window.chapterPages = pagesData.pageUrls;
    window.proxiedPages = pagesData.proxiedPageUrls || pagesData.pageUrls;
    window.totalPages = pagesData.pageUrls.length;
    useProxyByDefault = pagesData.useProxy === true;

    displayPage(1);
    elements.pageIndicator.textContent = `Page 1 / ${pagesData.pageUrls.length}`;

    if (elements.verticalToggle) {
      elements.verticalToggle.style.display = 'inline-block';
    }
  } catch (error) {
    console.error('Failed to load chapter:', error);
    showError(`Failed to load chapter: ${error.message}`);
    if (elements.mdFallback) elements.mdFallback.style.display = 'block';
  }
}

function displayPage(pageNum) {
  try {
    if (!window.chapterPages || pageNum < 1 || pageNum > window.chapterPages.length) return;

    currentPage = pageNum;
    elements.chapterPages.innerHTML = '';

    if (isVerticalMode && mangaParkImages.length > 0) {
      displayVerticalPages();
      return;
    }

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
        updatePageIndicator(pageNum);
      }
    };

    img.onerror = () => {
      if (currentAttempt === loadAttempts[pageNum]) {
        if (useProxyByDefault) tryDirectUrl(pageNum);
        else tryProxyUrl(pageNum);
      }
    };

    let initialUrl = useProxyByDefault ? window.proxiedPages[pageNum - 1] : window.chapterPages[pageNum - 1];
    img.src = initialUrl;
    img.alt = `Page ${pageNum}`;

    updateNavigation(pageNum);
    updateHistory(pageNum);
  } catch (error) {
    console.error('Error displaying page:', error);
    showError(`Failed to display page ${pageNum}: ${error.message}`);
  }
}

function displayVerticalPages() {
  elements.chapterPages.innerHTML = '';
  elements.chapterPages.classList.add('vertical-reader');
  
  mangaParkImages.forEach((imgUrl, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'vertical-page';
    
    const img = new Image();
    img.src = imgUrl;
    img.alt = `Page ${index + 1}`;
    img.className = 'manga-page';
    img.loading = 'lazy';
    img.onerror = () => img.src = 'placeholder.jpg';
    
    const pageNum = document.createElement('div');
    pageNum.className = 'page-number';
    pageNum.textContent = `Page ${index + 1}`;
    
    imgContainer.appendChild(img);
    imgContainer.appendChild(pageNum);
    elements.chapterPages.appendChild(imgContainer);
  });

  updatePageIndicator(currentPage);
  updateNavigation(currentPage);
  preloadAdjacentImages();
}

function preloadAdjacentImages() {
  const preloadRange = 2;
  for (let i = Math.max(0, currentPage - preloadRange); 
       i < Math.min(mangaParkImages.length, currentPage + preloadRange); 
       i++) {
    if (i !== currentPage - 1) {
      const img = new Image();
      img.src = mangaParkImages[i];
    }
  }
}

function updatePageIndicator(pageNum) {
  const total = isVerticalMode ? mangaParkImages.length : window.totalPages;
  elements.pageIndicator.textContent = `Page ${pageNum} / ${total}`;
}

function updateNavigation(pageNum) {
  const total = isVerticalMode ? mangaParkImages.length : window.totalPages;
  elements.prevPageBtn.disabled = pageNum <= 1;
  elements.nextPageBtn.disabled = pageNum >= total;
}

function updateHistory(pageNum) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', pageNum);
  window.history.replaceState({}, '', url);
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
}

function showPageError(pageNum) {
  elements.chapterPages.innerHTML = '';
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-state';
  errorDiv.innerHTML = `
    <p>Failed to load page ${pageNum}</p>
    <p class="error-detail">This might be due to CORS restrictions or API changes</p>
    <div class="error-actions">
      <button onclick="retryPage(${pageNum})" class="action-btn retry-btn">
        Retry Page
      </button>
      <button onclick="toggleLoadingMethod()" class="action-btn method-btn">
        Try Different Method
      </button>
      ${elements.mdLink?.href ? `
        <a href="${elements.mdLink.href}" target="_blank" class="action-btn md-btn">
          Open MangaDex
        </a>
      ` : ''}
    </div>
  `;
  elements.chapterPages.appendChild(errorDiv);
}

function setupReaderControls() {
  if (elements.verticalToggle) {
    elements.verticalToggle.addEventListener('click', toggleVerticalMode);
  }

  if (elements.fallbackMangaPark) {
    elements.fallbackMangaPark.addEventListener('click', loadMangaParkChapter);
  }

  setupPagination();
}

function toggleVerticalMode() {
  isVerticalMode = !isVerticalMode;
  elements.verticalToggle.classList.toggle('active');
  
  if (isVerticalMode && mangaParkImages.length === 0) {
    loadMangaParkChapter();
  } else {
    displayPage(currentPage);
  }
}

async function loadMangaParkChapter() {
  try {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-state';
    loadingElement.innerHTML = `
      <div class="spinner"></div>
      <p>Loading from MangaPark...</p>
    `;
    elements.chapterPages.innerHTML = '';
    elements.chapterPages.appendChild(loadingElement);

    const mangaTitle = document.querySelector('.chapter-title')?.textContent || '';
    const chapterMatch = mangaTitle.match(/(Chapter|Ch\.)\s?(\d+)/i);
    const chapterNum = chapterMatch ? chapterMatch[2] : '1';
    const cleanTitle = mangaTitle.replace(/(Chapter|Ch\.)\s?\d+/i, '').trim();

    const response = await fetch(
      `${API_BASE}/fetchMangaParkChapter?title=${encodeURIComponent(cleanTitle)}&chapter=${chapterNum}`,
      { signal: AbortSignal.timeout(20000) }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data?.images?.length) throw new Error(data?.error || 'No images found');

    mangaParkImages = data.images;
    mangaParkSource = data.source || 'https://mangapark.net';
    isVerticalMode = true;
    
    if (elements.verticalToggle) {
      elements.verticalToggle.classList.add('active');
      elements.verticalToggle.textContent = 'Exit Vertical Mode';
    }
    
    if (elements.mdLink) {
      elements.mdLink.href = mangaParkSource;
      elements.mdLink.textContent = 'Open on MangaPark';
    }
    
    displayVerticalPages();
    showToast('Switched to MangaPark successfully');
  } catch (error) {
    console.error('MangaPark fallback failed:', error);
    
    elements.chapterPages.innerHTML = `
      <div class="error-state">
        <h3>⚠️ MangaPark Unavailable</h3>
        <p class="error-detail">${error.message || 'Service temporarily unavailable'}</p>
        <div class="error-actions">
          <button onclick="retryMangaPark()" class="action-btn retry-btn">
            Try Again
          </button>
          <button onclick="location.reload()" class="action-btn reload-btn">
            Return to Original
          </button>
        </div>
      </div>
    `;
  }
}

function setupPagination() {
  elements.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) displayPage(currentPage - 1);
  });

  elements.nextPageBtn.addEventListener('click', () => {
    const total = isVerticalMode ? mangaParkImages.length : window.totalPages;
    if (currentPage < total) displayPage(currentPage + 1);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') elements.prevPageBtn.click();
    if (e.key === 'ArrowRight') elements.nextPageBtn.click();
  });

  let touchStartX = 0;
  let touchEndX = 0;
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) elements.nextPageBtn.click();
    else if (touchEndX > touchStartX + 50) elements.prevPageBtn.click();
  });

  const pageParam = urlParams.get('page');
  if (pageParam && !isNaN(parseInt(pageParam))) displayPage(parseInt(pageParam));
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <p>${message}</p>
    <button onclick="location.reload()" class="action-btn retry-btn">
      Reload Page
    </button>
  `;

  if (elements.chapterPages && elements.chapterPages.innerHTML === '') {
    elements.chapterPages.appendChild(errorDiv);
  } else {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Volume section collapse/expand
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.volume-section .volume-title').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement.querySelector('.volume-chapters');
      if (section) section.classList.toggle('collapsed');
    });
  });
});

// Global functions
window.retryMangaPark = loadMangaParkChapter;
window.toggleLoadingMethod = () => {
  useProxyByDefault = !useProxyByDefault;
  displayPage(currentPage);
};
window.retryPage = (pageNum) => {
  loadAttempts[pageNum] = 0;
  displayPage(pageNum);
};
