/**
 * bible-ui-injector.js
 * Injeta painéis de UI para as features de favoritos e índice
 */

function injectBibleFeaturesUI() {
    setTimeout(() => {
        // Injetar painéis (favoritos e índice) na seção bíblia
        const bibleSection = document.querySelector('.bible-section');
        if (bibleSection) {
            // Painel de Favoritos
            if (!document.getElementById('bible-favorites-panel')) {
                const favPanel = document.createElement('div');
                favPanel.id = 'bible-favorites-panel';
                favPanel.className = 'bible-panel';
                favPanel.style.display = 'none';
                favPanel.innerHTML = `
                    <div class="panel-header">
                        <h3>⭐ Versículos Favoritos</h3>
                        <button onclick="togglePanel('bible-favorites-panel')" class="close-btn">✕</button>
                    </div>
                    <div id="bible-favorites-list" class="panel-content"></div>
                `;
                bibleSection.appendChild(favPanel);
            }

            // Painel de Índice
            if (!document.getElementById('bible-book-index')) {
                const indexPanel = document.createElement('div');
                indexPanel.id = 'bible-book-index';
                indexPanel.className = 'bible-panel';
                indexPanel.style.display = 'none';
                indexPanel.innerHTML = `
                    <div class="panel-header">
                        <h3>📑 Índice de Livros</h3>
                        <button onclick="togglePanel('bible-book-index')" class="close-btn">✕</button>
                    </div>
                    <div id="bible-book-index-content" class="panel-content"></div>
                `;
                bibleSection.appendChild(indexPanel);
            }
        }

        // Atualizar contador de favoritos no badge do novo toolbar
        updateFavsCount();

    }, 600);
}

function updateFavsCount() {
    const count = (typeof BibleFeatures !== 'undefined') ? BibleFeatures.getFavorites().length : 0;
    const badge = document.getElementById('bible-favorites-count');
    if (badge) badge.textContent = count || '';
}

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display !== 'none' && panelId === 'bible-book-index') {
            BibleFeatures.renderBookIndex();
        }
    }
}


// Executar ao carregar
window.addEventListener('DOMContentLoaded', injectBibleFeaturesUI);
window.addEventListener('load', injectBibleFeaturesUI);
