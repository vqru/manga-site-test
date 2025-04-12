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
  mdFallback: document.querySelector('.md-fallback'),
  mangaCover: document.getElementById('manga-cover'),
  mangaTitle: document.getElementById('manga-title'),
  mangaAuthors: document.getElementById('manga-authors'),
  mangaStatus: document.getElementById('manga-status'),
  mangaDemographic: document.getElementById('manga-demographic'),
  mangaDescription: document.getElementById('manga-description')
};

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('manga');
const chapterId = urlParams.get('chapter');

// Initialize page based on URL parameters
window.addEventListener('DOMContentLoaded', async () => {
  try {
    if (chapterId) {
      if (elements.mdFallback) elements.mdFallback.style.display = 'none';
      await loadChapterPages(chapterId);
      setupPagination();
      elements.backBtn.href = mangaId ? `details.html?manga=${mangaId}` : 'index.html';
    } else if (mangaId) {
      await loadMangaDetails(mangaId);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Failed to initialize page: ${error.message}`);
  }
});

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

  // Use MangaPlus for chapters by title
  const titleName = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
  loadMangaPlusChapters(titleName);
}

async function loadMangaPlusChapters(title) {
  try {
    const res = await fetch(`${API_BASE}/fetchMangaPlusChapters?title=${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('Failed to fetch MangaPlus chapters');
    const data = await res.json();
    if (!data.chapters || data.chapters.length === 0) {
      elements.chaptersList.innerHTML = `<div class="no-chapters">No chapters available.</div>`;
      return;
    }

    const chaptersHtml = data.chapters.map(chap => `
      <div class="chapter-item">
        <a href="reader.html?manga=${chap.titleId}&chapter=${chap.id}" class="chapter-link">
          <div class="chapter-meta">
            <strong>Chapter ${chap.number || ''}</strong>
            ${chap.name ? `<span class="chapter-title">${chap.name}</span>` : ''}
            <div class="chapter-date">${chap.date || ''}</div>
          </div>
        </a>
      </div>
    `).join('');

    elements.chaptersList.innerHTML = `
      <div class="mangaplus-chapter-list">
        ${chaptersHtml}
      </div>
    `;
  } catch (err) {
    console.error('Error loading MangaPlus chapters:', err);
    elements.chaptersList.innerHTML = `<div class="error-message">Failed to load MangaPlus chapters.</div>`;
  }
}

// Page loading logic
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

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Reload Chapter';
    reloadBtn.className = 'reload-btn';
    reloadBtn.onclick = () => loadChapterPages(chapterId);
    elements.chapterPages.parentNode.appendChild(reloadBtn);
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
        if (useProxyByDefault) tryDirectUrl(pageNum);
        else tryProxyUrl(pageNum);
      }
    };

    let initialUrl = useProxyByDefault ? window.proxiedPages[pageNum - 1] : window.chapterPages[pageNum - 1];
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
    <p>Failed to load page ${pageNum}. This might be due to CORS restrictions or API changes.</p>
    <div class="error-actions">
      <button onclick="retryPage(${pageNum})">Retry Page</button>
      <button onclick="toggleLoadingMethod()">Try Different Method</button>
      <a href="${elements.mdLink.href}" target="_blank" class="md-button">Read on MangaDex</a>
    </div>
  `;
  elements.chapterPages.appendChild(errorDiv);
  if (elements.mdFallback) elements.mdFallback.style.display = 'block';
}

window.toggleLoadingMethod = () => {
  useProxyByDefault = !useProxyByDefault;
  displayPage(currentPage);
};

window.retryPage = (pageNum) => {
  loadAttempts[pageNum] = 0;
  displayPage(pageNum);
};

function setupPagination() {
  elements.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) displayPage(currentPage - 1);
  });

  elements.nextPageBtn.addEventListener('click', () => {
    if (currentPage < window.chapterPages.length) displayPage(currentPage + 1);
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
  errorDiv.textContent = message;
  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry Loading';
  retryBtn.className = 'retry-btn';
  retryBtn.onclick = () => location.reload();
  errorDiv.appendChild(retryBtn);

  if (elements.chapterPages && elements.chapterPages.innerHTML === '') {
    elements.chapterPages.appendChild(errorDiv);
  } else {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }

  if (elements.mdFallback) elements.mdFallback.style.display = 'block';
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
