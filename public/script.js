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

// HOMEPAGE: Load categorized manga sections
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('popular-list')) {
    loadSection('popular-list', 'followedCount');
    loadSection('recent-list', 'latestUploadedChapter');
    loadSection('toprated-list', 'rating');
    loadSection('new-list', 'createdAt');
  }

  // If chapter or manga ID is present, load details
  try {
    if (chapterId) {
      if (elements.mdFallback) elements.mdFallback.style.display = 'none';
      loadChapterPages(chapterId);
      setupPagination();
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
