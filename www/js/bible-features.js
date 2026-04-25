/**
 * FASE 1: 4 Features Core para Aba Bíblia
 * 1. Histórico de Leitura (último cap/verso)
 * 2. Favoritos/Marcadores (salvar versículos)
 * 3. Índice de 66 Livros (navegação rápida)
 * 4. Dark Mode / Tema (noturno + fonte)
 */

const BibleFeatures = (() => {
    // Storage Keys
    const STORAGE_KEY_HISTORY = 'bussola-bible-history';
    const STORAGE_KEY_FAVORITES = 'bussola-bible-favorites';
    const STORAGE_KEY_THEME = 'bussola-bible-theme';
    const STORAGE_KEY_FONT = 'bussola-bible-font-size';

    // Estado
    // Sempre escuro — reseta qualquer valor 'light' salvo anteriormente
    localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    let currentTheme = 'dark';
    let currentFontSize = parseInt(localStorage.getItem(STORAGE_KEY_FONT)) || 16;
    let favorites = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_FAVORITES) || '[]'));

    async function sendSWMessage(type, payload) {
        return new Promise(async (resolve) => {
            try {
                if (!navigator.serviceWorker) {
                    resolve(null);
                    return;
                }

                const registration = await navigator.serviceWorker.ready;
                const sw = navigator.serviceWorker.controller || (registration && registration.active);
                if (!sw) {
                    resolve(null);
                    return;
                }

                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => resolve(event.data || null);
                sw.postMessage({ type, payload }, [channel.port2]);
            } catch {
                resolve(null);
            }
        });
    }

    async function syncFavoritesToSW() {
        await sendSWMessage('SAVE_FAVORITES', Array.from(favorites));
    }

    async function syncHistoryToSW(history) {
        await sendSWMessage('SAVE_HISTORY', history || {});
    }

    async function restoreBibleDataFromSW() {
        const favoritesResult = await sendSWMessage('LOAD_FAVORITES');
        const favoritePayload = favoritesResult && favoritesResult.payload && favoritesResult.payload.data;
        if (Array.isArray(favoritePayload) && favoritePayload.length) {
            favorites = new Set(favoritePayload);
            localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(Array.from(favorites)));
            updateFavoritesUI();
        }

        const historyResult = await sendSWMessage('LOAD_HISTORY');
        const historyPayload = historyResult && historyResult.payload && historyResult.payload.data;
        if (historyPayload && typeof historyPayload === 'object') {
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyPayload));
        }
    }

    // ===== FEATURE 1: HISTÓRICO DE LEITURA =====
    function saveReadingHistory(book, chapter) {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '{}');
        history.lastBook = book;
        history.lastChapter = chapter;
        history.timestamp = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        syncHistoryToSW(history);
    }

    function loadReadingHistory() {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '{}');
        return {
            book: history.lastBook || 1,
            chapter: history.lastChapter || 1,
            timestamp: history.timestamp
        };
    }

    // ===== FEATURE 2: FAVORITOS =====
    function toggleFavorite(book, chapter, verse) {
        const key = `${book}:${chapter}:${verse}`;
        if (favorites.has(key)) {
            favorites.delete(key);
        } else {
            favorites.add(key);
        }
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(Array.from(favorites)));
        updateFavoritesUI();
        syncFavoritesToSW();
        return favorites.has(key);
    }

    function isFavorite(book, chapter, verse) {
        return favorites.has(`${book}:${chapter}:${verse}`);
    }

    function getFavorites() {
        return Array.from(favorites).map(key => {
            const [book, chapter, verse] = key.split(':').map(Number);
            return { book, chapter, verse };
        }).sort((a, b) => {
            if (a.book !== b.book) return a.book - b.book;
            if (a.chapter !== b.chapter) return a.chapter - b.chapter;
            return a.verse - b.verse;
        });
    }

    function updateFavoritesUI() {
        const count = favorites.size;
        const badge = document.getElementById('bible-favorites-count');
        if (badge) badge.textContent = count;
        
        // Atualizar botões de favoritismo na renderização atual
        document.querySelectorAll('.fav-btn').forEach(btn => {
            const verse = btn.closest('.bible-verse-block');
            if (verse) {
                const book = parseInt(verse.dataset.book);
                const chapter = parseInt(verse.dataset.chapter);
                const verse_num = parseInt(verse.dataset.verse);
                if (isFavorite(book, chapter, verse_num)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    function renderFavoritesList() {
        const faveList = document.getElementById('bible-favorites-list');
        if (!faveList) return;

        const faves = getFavorites();
        if (faves.length === 0) {
            faveList.innerHTML = '<div class="empty-message">Nenhum versículo favorito ainda. Clique em ⭐ para marcar.</div>';
            return;
        }

        let html = '<div class="favorites-grid">';
        faves.forEach(f => {
            const ref = `${Bible.BOOK_NAMES_PT?.[f.book] || ('Livro ' + f.book)} ${f.chapter}:${f.verse}`;
            html += `<div class="favorite-item" onclick="Bible.goToVerse(${f.book}, ${f.chapter}, ${f.verse}); Bible.showTab('bible');">
                <span class="fav-ref">${ref}</span>
                <button onclick="event.stopPropagation(); BibleFeatures.toggleFavorite(${f.book}, ${f.chapter}, ${f.verse});" class="remove-fav">✕</button>
            </div>`;
        });
        html += '</div>';
        faveList.innerHTML = html;
    }

    // ===== FEATURE 3: ÍNDICE DE 66 LIVROS =====
    function renderBookIndex() {
        const indexPanel = document.getElementById('bible-book-index');
        if (!indexPanel) return;

        let html = '<div class="book-index-content">';
        html += '<div class="book-index-section">';
        html += '<h4>📜 Antigo Testamento (39)</h4>';
        html += '<div class="book-index-grid">';
        for (let i = 1; i <= 39; i++) {
            const name = Bible.BOOK_NAMES_PT?.[i] || ('Livro ' + i);
            html += `<button class="book-index-btn" onclick="Bible.goToVerse(${i}, 1, 1); document.getElementById('bible-book-index').style.display='none';">${name}</button>`;
        }
        html += '</div></div>';

        html += '<div class="book-index-section">';
        html += '<h4>✝️ Novo Testamento (27)</h4>';
        html += '<div class="book-index-grid">';
        for (let i = 40; i <= 66; i++) {
            const name = Bible.BOOK_NAMES_PT?.[i] || ('Livro ' + i);
            html += `<button class="book-index-btn" onclick="Bible.goToVerse(${i}, 1, 1); document.getElementById('bible-book-index').style.display='none';">${name}</button>`;
        }
        html += '</div></div>';

        html += '<div class="book-index-section">';
        html += '<h4>📗 Deuterocanônicos (22)</h4>';
        html += '<div class="book-index-grid">';
        for (let i = 67; i <= 88; i++) {
            const name = Bible.BOOK_NAMES_PT?.[i] || ('Livro ' + i);
            html += `<button class="book-index-btn" onclick="Bible.goToVerse(${i}, 1, 1); document.getElementById('bible-book-index').style.display='none';">${name}</button>`;
        }
        html += '</div></div>';

        html += '</div>';
        indexPanel.innerHTML = html;
    }

    function toggleBookIndex() {
        const panel = document.getElementById('bible-book-index');
        if (!panel) return;
        if (panel.style.display === 'none' || !panel.style.display) {
            renderBookIndex();
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    // ===== FEATURE 4: DARK MODE / TEMA =====
    function getBibleContainer() {
        return document.getElementById('tab-bible') || document.documentElement;
    }

    function setTheme(theme) {
        currentTheme = theme;
        localStorage.setItem(STORAGE_KEY_THEME, theme);
        getBibleContainer().setAttribute('data-bible-theme', theme);
        
        const btn = document.getElementById('bible-theme-toggle');
        if (btn) btn.innerHTML = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
    }

    function toggleDarkMode() {
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    function setFontSize(size) {
        currentFontSize = Math.max(12, Math.min(28, size));
        localStorage.setItem(STORAGE_KEY_FONT, String(currentFontSize));
        document.documentElement.style.setProperty('--bible-font-size', currentFontSize + 'px');
        updateFontButtons();
    }

    function adjustFontSize(delta) {
        setFontSize(currentFontSize + delta);
    }

    function getCurrentFontSize() {
        return currentFontSize;
    }

    function updateFontButtons() {
        const btn16 = document.getElementById('bible-font-16');
        const btn18 = document.getElementById('bible-font-18');
        const btn20 = document.getElementById('bible-font-20');
        
        if (btn16) btn16.className = currentFontSize === 16 ? 'font-btn active' : 'font-btn';
        if (btn18) btn18.className = currentFontSize === 18 ? 'font-btn active' : 'font-btn';
        if (btn20) btn20.className = currentFontSize === 20 ? 'font-btn active' : 'font-btn';
    }

    function initThemeOnLoad() {
        getBibleContainer().setAttribute('data-bible-theme', currentTheme);
        document.documentElement.style.setProperty('--bible-font-size', currentFontSize + 'px');
        updateFontButtons();
    }

    // ===== CHECKPOINT 1 =====
    function validateCheckpoint1() {
        const checks = {
            history: typeof saveReadingHistory === 'function',
            favorites: typeof toggleFavorite === 'function' && favorites instanceof Set,
            bookIndex: typeof renderBookIndex === 'function',
            darkMode: typeof setTheme === 'function' && currentTheme !== undefined
        };
        
        console.log('📊 CHECKPOINT 1 - Aba Bíblia (4 Features Core):', checks);
        return Object.values(checks).every(c => c);
    }

    return {
        // Feature 1
        saveReadingHistory, loadReadingHistory,
        // Feature 2
        toggleFavorite, isFavorite, getFavorites, renderFavoritesList,
        // Feature 3
        renderBookIndex, toggleBookIndex,
        // Feature 4
        setTheme, toggleDarkMode, setFontSize, adjustFontSize, initThemeOnLoad, getCurrentFontSize,
        // Offline sync
        restoreBibleDataFromSW,
        // Checkpoint
        validateCheckpoint1
    };
})();

// Inicializar tema ao carregar
window.addEventListener('DOMContentLoaded', () => {
    BibleFeatures.initThemeOnLoad();
    BibleFeatures.restoreBibleDataFromSW();
});
