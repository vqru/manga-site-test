// Global variables
const API_BASE = '/.netlify/functions';
let currentPage = 1;
let loadAttempts = {};
let useProxyByDefault = true;

// Safe DOM element getter
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} not found`);
    return el || null;
}

// DOM Elements with null checks
const elements = {
    search: getElement('search'),
    results: getElement('results'),
    mangaDetails: getElement('manga-details'),
    chaptersList: getElement('chapters-list'),
    chapterPages: getElement('chapter-pages'),
    pageIndicator: getElement('page-indicator'),
    prevPageBtn: getElement('prev-page'),
    nextPageBtn: getElement('next-page'),
    backBtn: getElement('back-btn'),
    mdLink: getElement('md-link'),
    mdFallback: document.querySelector('.md-fallback'),
    mangaCover: getElement('manga-cover'),
    mangaTitle: getElement('manga-title'),
    mangaAuthors: getElement('manga-authors'),
    mangaStatus: getElement('manga-status'),
    mangaDemographic: getElement('manga-demographic'),
    mangaDescription: getElement('manga-description')
};

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('manga');
const chapterId = urlParams.get('chapter');

// Read More Toggle Functionality
function setupReadMoreButtons() {
    const buttons = document.querySelectorAll('.read-more-btn');
    if (!buttons.length) return;
    
    buttons.forEach(btn => {
        // Remove any existing listeners to prevent duplicates
        btn.replaceWith(btn.cloneNode(true));
        
        // Add new listener to the new button
        const newBtn = document.querySelector(`#${btn.id}`) || btn;
        newBtn.addEventListener('click', () => {
            const description = newBtn.previousElementSibling;
            if (!description) return;
            
            description.classList.toggle('expanded');
            newBtn.classList.toggle('expanded');
            newBtn.innerHTML = description.classList.contains('expanded') 
                ? 'Read Less <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 15l-6-6-6 6" stroke-width="2" stroke-linecap="round"/></svg>'
                : 'Read More <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round"/></svg>';
        });
    });
}

// Initialize page based on URL parameters
window.addEventListener('DOMContentLoaded', async () => {
    try {
        if (chapterId) {
            if (elements.mdFallback) {
                elements.mdFallback.style.display = 'none';
            }

            await loadChapterPages(chapterId);
            setupPagination();

            if (elements.backBtn) {
                elements.backBtn.href = mangaId
                    ? `details.html?manga=${mangaId}`
                    : 'index.html';
            }
        } else if (mangaId) {
            await loadMangaDetails(mangaId);
        }
        setupReadMoreButtons();
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
    const volumes = data.volumes || {};

    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
    const coverUrl = `/.netlify/functions/proxyImage?url=${encodeURIComponent(manga.coverUrl || '')}`;
    document.title = `${title} - Manga Viewer`;
    
    if (elements.mangaTitle) elements.mangaTitle.textContent = title;
    if (elements.mangaCover) elements.mangaCover.innerHTML = `<img src="${coverUrl}" alt="${title}" onerror="this.src='placeholder.jpg'" style="max-height:100%;width:auto;object-fit:contain;">`;
    if (elements.mangaAuthors) elements.mangaAuthors.textContent = manga.relationships?.find(r => r.type === 'author')?.attributes?.name || 'Unknown';
    if (elements.mangaStatus) elements.mangaStatus.textContent = manga.attributes.status || 'Unknown';
    if (elements.mangaDemographic) elements.mangaDemographic.textContent = manga.attributes.publicationDemographic || 'Unknown';
    
    // Always show Read More button regardless of description length
    if (elements.mangaDescription) {
        elements.mangaDescription.innerHTML = `
            <div class="manga-description">
                ${manga.attributes.description?.en || 'No description.'}
            </div>
            <button class="read-more-btn">
                Read More 
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
    }

    if (elements.chaptersList) {
        displayChaptersList(volumes);
    }
    setupReadMoreButtons();
}

function displayChaptersList(volumes) {
    try {
        if (!volumes || Object.keys(volumes).length === 0) {
            if (elements.chaptersList) {
                elements.chaptersList.innerHTML = '<div class="no-chapters">No chapters available.</div>';
            }
            return;
        }

        const volumeKeys = Object.keys(volumes);

        if (elements.chaptersList) {
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
        }
    } catch (error) {
        console.error('Error displaying chapters list:', error);
        if (elements.chaptersList) {
            elements.chaptersList.innerHTML = `<div class="error-message">Failed to load chapters list: ${error.message}</div>`;
        }
    }
}

async function loadChapterPages(chapterId) {
    try {
        if (!elements.chapterPages) return;

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
        if (!document.querySelector('.chapter-title') && elements.chapterPages.parentNode) {
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
        if (elements.pageIndicator) {
            elements.pageIndicator.textContent = `Page 1 / ${pagesData.pageUrls.length}`;
        }

        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = 'Reload Chapter';
        reloadBtn.className = 'reload-btn';
        reloadBtn.addEventListener('click', () => {
            loadChapterPages(chapterId);
        });
        if (elements.chapterPages.parentNode) {
            elements.chapterPages.parentNode.appendChild(reloadBtn);
        }

    } catch (error) {
        console.error('Failed to load chapter:', error);
        showError(`Failed to load chapter: ${error.message}`);

        if (elements.mdFallback) {
            elements.mdFallback.style.display = 'block';
        }
    }
}

function displayPage(pageNum) {
    try {
        if (!window.chapterPages || pageNum < 1 || pageNum > window.chapterPages.length || !elements.chapterPages) return;

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
                if (elements.pageIndicator) {
                    elements.pageIndicator.textContent = `Page ${pageNum} / ${window.totalPages}`;
                }
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

        if (elements.prevPageBtn) elements.prevPageBtn.disabled = pageNum <= 1;
        if (elements.nextPageBtn) elements.nextPageBtn.disabled = pageNum >= window.chapterPages.length;

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
        if (elements.chapterPages) {
            elements.chapterPages.innerHTML = '';
            img.className = 'manga-page';
            elements.chapterPages.appendChild(img);
            useProxyByDefault = false;
        }
    };
    img.onerror = () => showPageError(pageNum);
    img.src = window.chapterPages[pageNum - 1];
    img.alt = `Page ${pageNum}`;
}

function tryProxyUrl(pageNum) {
    const img = new Image();
    img.onload = () => {
        if (elements.chapterPages) {
            elements.chapterPages.innerHTML = '';
            img.className = 'manga-page';
            elements.chapterPages.appendChild(img);
            useProxyByDefault = true;
        }
    };
    img.onerror = () => showPageError(pageNum);
    img.src = window.proxiedPages[pageNum - 1];
    img.alt = `Page ${pageNum}`;
}

function showPageError(pageNum) {
    if (!elements.chapterPages) return;

    elements.chapterPages.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.innerHTML = `
        <p>Failed to load page ${pageNum}. This might be due to CORS restrictions or API changes.</p>
        <p>You can try the following:</p>
        <div class="error-actions">
            <button onclick="retryPage(${pageNum})">Retry Page</button>
            <button onclick="toggleLoadingMethod()">Try Different Method</button>
            <a href="${elements.mdLink?.href || '#'}" target="_blank" class="md-button">Read on MangaDex</a>
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
    if (!elements.prevPageBtn || !elements.nextPageBtn) return;

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
    if (!message) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry Loading';
    retryBtn.className = 'retry-btn';
    retryBtn.addEventListener('click', () => {
        location.reload();
    });
    errorDiv.appendChild(retryBtn);

    // Try to find a sensible place to insert the error
    if (elements.chapterPages && elements.chapterPages.innerHTML === '') {
        elements.chapterPages.appendChild(errorDiv);
    } else if (elements.results) {
        elements.results.appendChild(errorDiv);
    } else {
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }

    if (elements.mdFallback) {
        elements.mdFallback.style.display = 'block';
    }
}

// Collapse/expand chapter volumes
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.volume-section h2').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            if (section && section.classList) {
                section.classList.toggle('collapsed');
            }
        });
    });
});
