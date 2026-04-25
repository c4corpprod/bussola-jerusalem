/* ═══════════════════════════════════════════════════════════════
   🧾 STUDIES MODULE — Bússola para Jerusalém
   Pesquisa de citações bíblicas por tema/livro/palavra e notas locais.
   ═══════════════════════════════════════════════════════════════ */

const StudiesModule = (() => {
    const NOTES_KEY = 'bussola-studies-notes';

    // ── Mapeamento Inglês → Português para livros bíblicos ──
    const BOOKS_PT = {
        'Genesis':'Gênesis','Exodus':'Êxodo','Leviticus':'Levítico','Numbers':'Números',
        'Deuteronomy':'Deuteronômio','Joshua':'Josué','Judges':'Juízes','Ruth':'Rute',
        '1 Samuel':'1 Samuel','2 Samuel':'2 Samuel','1 Kings':'1 Reis','2 Kings':'2 Reis',
        '1 Chronicles':'1 Crônicas','2 Chronicles':'2 Crônicas','Ezra':'Esdras',
        'Nehemiah':'Neemias','Esther':'Ester','Job':'Jó','Psalms':'Salmos',
        'Proverbs':'Provérbios','Ecclesiastes':'Eclesiastes','Song of Solomon':'Cantares',
        'Isaiah':'Isaías','Jeremiah':'Jeremias','Lamentations':'Lamentações',
        'Ezekiel':'Ezequiel','Daniel':'Daniel','Hosea':'Oséias','Joel':'Joel',
        'Amos':'Amós','Obadiah':'Obadias','Jonah':'Jonas','Micah':'Miquéias',
        'Nahum':'Naum','Habakkuk':'Habacuque','Zephaniah':'Sofonias','Haggai':'Ageu',
        'Zechariah':'Zacarias','Malachi':'Malaquias','Matthew':'Mateus','Mark':'Marcos',
        'Luke':'Lucas','John':'João','Acts':'Atos','Romans':'Romanos',
        '1 Corinthians':'1 Coríntios','2 Corinthians':'2 Coríntios','Galatians':'Gálatas',
        'Ephesians':'Efésios','Philippians':'Filipenses','Colossians':'Colossenses',
        '1 Thessalonians':'1 Tessalonicenses','2 Thessalonians':'2 Tessalonicenses',
        '1 Timothy':'1 Timóteo','2 Timothy':'2 Timóteo','Titus':'Tito',
        'Philemon':'Filemom','Hebrews':'Hebreus','James':'Tiago','1 Peter':'1 Pedro',
        '2 Peter':'2 Pedro','1 John':'1 João','2 John':'2 João','3 John':'3 João',
        'Jude':'Judas','Revelation':'Apocalipse'
    };
    function bookPt(en) { return BOOKS_PT[en] || en; }

    const CITATIONS = [
        { id: 'c1', theme: 'Esperanca', book: 'Salmos', chapter: 23, verse: 1, text: 'O Senhor é o meu pastor; nada me faltará.', tags: ['confianca', 'provisao', 'paz'] },
        { id: 'c2', theme: 'Oracao', book: 'Salmos', chapter: 122, verse: 6, text: 'Orai pela paz de Jerusalém.', tags: ['jerusalem', 'intercessao'] },
        { id: 'c3', theme: 'Fe', book: 'Hebreus', chapter: 11, verse: 1, text: 'A fé é a certeza das coisas que se esperam.', tags: ['certeza', 'promessa'] },
        { id: 'c4', theme: 'Amor', book: '1 Coríntios', chapter: 13, verse: 7, text: 'O amor tudo sofre, tudo crê, tudo espera, tudo suporta.', tags: ['amor', 'familia'] },
        { id: 'c5', theme: 'Sabedoria', book: 'Provérbios', chapter: 3, verse: 5, text: 'Confia no Senhor de todo o teu coração.', tags: ['direcao', 'confianca'] },
        { id: 'c6', theme: 'Arrependimento', book: 'Salmos', chapter: 51, verse: 10, text: 'Cria em mim, ó Deus, um coração puro.', tags: ['restauracao', 'santidade'] },
        { id: 'c7', theme: 'Coragem', book: 'Josué', chapter: 1, verse: 9, text: 'Sê forte e corajoso. Não temas.', tags: ['forca', 'animo'] },
        { id: 'c8', theme: 'Direcao', book: 'Salmos', chapter: 119, verse: 105, text: 'Lâmpada para os meus pés é a tua palavra.', tags: ['palavra', 'caminho'] },
        { id: 'c9', theme: 'Graca', book: 'Efésios', chapter: 2, verse: 8, text: 'Pela graça sois salvos, por meio da fé.', tags: ['salvacao', 'fe'] },
        { id: 'c10', theme: 'Perdao', book: 'Colossenses', chapter: 3, verse: 13, text: 'Perdoando uns aos outros, como o Senhor vos perdoou.', tags: ['relacionamentos', 'misericordia'] },
        { id: 'c11', theme: 'Santidade', book: '1 Pedro', chapter: 1, verse: 16, text: 'Sede santos, porque eu sou santo.', tags: ['consagracao'] },
        { id: 'c12', theme: 'Misericordia', book: 'Lamentações', chapter: 3, verse: 22, text: 'As misericórdias do Senhor são a causa de não sermos consumidos.', tags: ['graca', 'renovo'] },
        { id: 'c13', theme: 'Paz', book: 'Filipenses', chapter: 4, verse: 7, text: 'A paz de Deus guardará o vosso coração.', tags: ['ansiedade', 'descanso'] },
        { id: 'c14', theme: 'Adoracao', book: 'Salmos', chapter: 150, verse: 6, text: 'Todo ser que respira louve ao Senhor.', tags: ['louvor'] },
        { id: 'c15', theme: 'Discipulado', book: 'Mateus', chapter: 28, verse: 19, text: 'Ide e fazei discípulos de todas as nações.', tags: ['missao', 'evangelho'] }
    ];

    let filtered = [...CITATIONS];

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

    async function syncNotesToSW(notes) {
        await sendSWMessage('SAVE_STUDIES_NOTES', notes || {});
    }

    async function restoreNotesFromSW() {
        const result = await sendSWMessage('LOAD_STUDIES_NOTES');
        const payload = result && result.payload && result.payload.data;
        if (payload && typeof payload === 'object') {
            localStorage.setItem(NOTES_KEY, JSON.stringify(payload));
        }
    }

    async function init() {
        await restoreNotesFromSW();
        fillThemeOptions();
        fillBookOptions();
        applyFilters();
    }

    function fillThemeOptions() {
        const select = document.getElementById('studies-theme');
        if (!select) return;
        const themes = [...new Set(CITATIONS.map((c) => c.theme))].sort();
        select.innerHTML = '<option value="">Todos os temas</option>' + themes.map((theme) => (
            `<option value="${escapeHtml(theme)}">${escapeHtml(theme)}</option>`
        )).join('');
    }

    function fillBookOptions() {
        const select = document.getElementById('studies-book');
        if (!select) return;
        const books = [...new Set(CITATIONS.map((c) => c.book))].sort();
        select.innerHTML = '<option value="">Todos os livros</option>' + books.map((book) => (
            `<option value="${escapeHtml(book)}">${escapeHtml(book)}</option>`
        )).join('');
    }

    function applyFilters() {
        const theme = (document.getElementById('studies-theme') || {}).value || '';
        const book = (document.getElementById('studies-book') || {}).value || '';
        const query = ((document.getElementById('studies-search') || {}).value || '').trim().toLowerCase();

        filtered = CITATIONS.filter((citation) => {
            const byTheme = !theme || citation.theme === theme;
            const byBook = !book || citation.book === book;
            const haystack = `${citation.text} ${citation.theme} ${citation.book} ${citation.tags.join(' ')}`.toLowerCase();
            const byQuery = !query || haystack.includes(query);
            return byTheme && byBook && byQuery;
        });

        renderSummary();
        renderList();
    }

    function renderSummary() {
        const summary = document.getElementById('studies-summary');
        if (!summary) return;
        summary.textContent = `${filtered.length} citação(ões) encontradas`;
    }

    function renderList() {
        const container = document.getElementById('studies-list');
        if (!container) return;

        if (!filtered.length) {
            container.innerHTML = '<p class="post-empty">Nenhuma citação encontrada para os filtros atuais.</p>';
            return;
        }

        const notes = readNotes();
        container.innerHTML = filtered.map((citation) => {
            const ref = `${citation.book} ${citation.chapter}:${citation.verse}`;
            const note = notes[citation.id] || '';

            return `
                <article class="study-card">
                    <div class="study-head">
                        <span class="study-theme">${escapeHtml(citation.theme)}</span>
                        <span class="study-ref">${escapeHtml(ref)}</span>
                    </div>
                    <p class="study-text">${escapeHtml(citation.text)}</p>
                    <div class="study-tags">${citation.tags.map((tag) => `<span class="study-tag">#${escapeHtml(tag)}</span>`).join('')}</div>
                    <div class="study-actions">
                        <button class="btn-small" onclick="StudiesModule.openInBible('${escapeJs(citation.book)}', ${citation.chapter}, ${citation.verse})">Abrir na Bíblia</button>
                        <button class="btn-small" onclick="StudiesModule.toggleNote('${citation.id}')">Anotação</button>
                    </div>
                    <div id="study-note-wrap-${citation.id}" class="study-note-wrap ${note ? '' : 'hidden'}">
                        <textarea id="study-note-${citation.id}" class="sacred-input sacred-textarea" placeholder="Sua anotação sobre esta citação...">${escapeHtml(note)}</textarea>
                        <button class="sacred-btn" onclick="StudiesModule.saveNote('${citation.id}')">Salvar anotação</button>
                    </div>
                </article>
            `;
        }).join('');
    }

    function openInBible(book, chapter, verse) {
        if (typeof switchTab === 'function') {
            switchTab('tab-bible');
        }

        if (typeof initBibleIfNeeded === 'function') {
            initBibleIfNeeded();
        }

        setTimeout(() => {
            if (typeof Bible !== 'undefined' && typeof Bible.goToVerse === 'function') {
                Bible.goToVerse(book, chapter, verse);
            }
        }, 350);
    }

    function toggleNote(citationId) {
        const wrap = document.getElementById(`study-note-wrap-${citationId}`);
        if (!wrap) return;
        wrap.classList.toggle('hidden');
    }

    function readNotes() {
        try {
            return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveNote(citationId) {
        const textarea = document.getElementById(`study-note-${citationId}`);
        if (!textarea) return;

        const notes = readNotes();
        const value = textarea.value.trim();

        if (!value) {
            delete notes[citationId];
        } else {
            notes[citationId] = value.slice(0, 1200);
        }

        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
        syncNotesToSW(notes);
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = String(value || '');
        return div.innerHTML;
    }

    function escapeJs(value) {
        return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    /* ══════════════════════════════════════════════════
       ESTUDOS DA COMUNIDADE (criados por usuários logados)
    ══════════════════════════════════════════════════ */

    let communityStudies = [];
    let communityPage = 1;
    const COMMUNITY_LIMIT = 10;

    async function loadCommunityStudies(page = 1) {
        communityPage = page;
        const container = document.getElementById('community-studies-list');
        const loadMoreBtn = document.getElementById('community-studies-more');
        if (!container) return;

        if (page === 1) container.innerHTML = '<p style="text-align:center;padding:16px;color:var(--text-muted)">⏳ Carregando estudos...</p>';

        try {
            const backendBase = window.BACKEND_URL || '';
            const searchQ = (document.getElementById('community-studies-search') || {}).value || '';
            let url = `${backendBase}/api/posts?type=study&page=${page}&limit=${COMMUNITY_LIMIT}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            let posts = data.posts || [];
            // Filtro local por busca
            if (searchQ.trim()) {
                const q = searchQ.trim().toLowerCase();
                posts = posts.filter((s) => {
                    return (s.title || '').toLowerCase().includes(q)
                        || (s.content || '').toLowerCase().includes(q)
                        || bookPt(s.bible_book || '').toLowerCase().includes(q);
                });
            }

            if (page === 1) communityStudies = posts;
            else communityStudies = [...communityStudies, ...posts];

            renderCommunityStudies();

            if (loadMoreBtn) {
                loadMoreBtn.style.display = data.page < data.pages ? 'block' : 'none';
            }
        } catch (e) {
            container.innerHTML = `<p style="text-align:center;color:var(--text-muted)">🔌 Estudos da comunidade indisponíveis offline.</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
    }

    function renderCommunityStudies() {
        const container = document.getElementById('community-studies-list');
        if (!container) return;

        if (!communityStudies.length) {
            container.innerHTML = '<p class="post-empty">Nenhum estudo da comunidade ainda. Seja o primeiro!</p>';
            return;
        }

        function esc(v) {
            const div = document.createElement('div');
            div.textContent = String(v || '');
            return div.innerHTML;
        }

        container.innerHTML = communityStudies.map((s) => {
            const ref = s.bible_book ? `${s.bible_book} ${s.bible_chapter || ''}:${s.bible_verse || ''}` : '';
            const date = new Date(s.created_at).toLocaleDateString('pt-BR');
            return `
                <article class="study-card community-study-card">
                    <div class="study-head">
                        <span class="study-author-chip" onclick="CommunityModule.showPublicProfile(${s.profile_id})" style="cursor:pointer">
                            ${esc(s.author_avatar || '🕎')} ${esc(s.author_name || 'Anônimo')}
                        </span>
                        <span class="study-date">${date}</span>
                    </div>
                    ${s.title ? `<h4 class="study-title">${esc(s.title)}</h4>` : ''}
                    <p class="study-text">${esc(s.content.slice(0, 300))}${s.content.length > 300 ? '...' : ''}</p>
                    ${ref ? `<span class="study-ref">${esc(ref)}</span>` : ''}
                    <div class="study-actions">
                        ${ref && s.bible_book ? `<button class="btn-small" onclick="StudiesModule.openInBible('${s.bible_book.replace(/'/g,"\\'")}', ${s.bible_chapter || 1}, ${s.bible_verse || 1})">Abrir na Bíblia</button>` : ''}
                        <span class="study-likes">❤️ ${s.likes || 0}</span>
                    </div>
                </article>
            `;
        }).join('');
    }

    function showCreateStudyModal() {
        const token = localStorage.getItem('bj_session_token');
        if (!token) {
            if (typeof CommunityModule !== 'undefined') CommunityModule.showLoginModal();
            return;
        }

        const existing = document.getElementById('create-study-modal');
        if (existing) { existing.classList.remove('hidden'); return; }

        // Preencher seletor de livros bíblicos (nomes em PT, valor em EN para o backend)
        const booksEn = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
        const bookOptions = booksEn.map((b) => `<option value="${b}">${bookPt(b)}</option>`).join('');

        const modal = document.createElement('div');
        modal.id = 'create-study-modal';
        modal.className = 'modal';
        // Fechar ao clicar no backdrop
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
        modal.innerHTML = `
            <div class="modal-content profile-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('create-study-modal').classList.add('hidden')">✕</button>
                <div class="modal-icon">📖</div>
                <h2>Publicar Estudo</h2>

                <label>Título (opcional)</label>
                <input type="text" id="cs-title" class="sacred-input" placeholder="Título do seu estudo" maxlength="200">

                <label style="margin-top:10px">Citação Bíblica (opcional)</label>
                <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;margin-bottom:8px">
                    <select id="cs-book" class="sacred-input" style="font-size:0.82rem">
                        <option value="">Livro...</option>
                        ${bookOptions}
                    </select>
                    <input type="number" id="cs-chapter" class="sacred-input" placeholder="Cap." min="1" max="150">
                    <input type="number" id="cs-verse" class="sacred-input" placeholder="Vers." min="1" max="200">
                </div>

                <label>Seu estudo <span style="color:var(--text-muted);font-size:0.8rem">(obrigatório)</span></label>
                <textarea id="cs-content" class="sacred-input sacred-textarea" placeholder="Compartilhe sua reflexão, análise ou meditação bíblica..." maxlength="2000" rows="6"></textarea>

                <button id="cs-btn" class="sacred-btn" onclick="StudiesModule.submitCreateStudy()">📖 Publicar estudo</button>
                <p id="cs-msg" class="login-msg"></p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function submitCreateStudy() {
        const title = (document.getElementById('cs-title') || {}).value || '';
        const book = (document.getElementById('cs-book') || {}).value || '';
        const chapter = parseInt((document.getElementById('cs-chapter') || {}).value, 10) || null;
        const verse = parseInt((document.getElementById('cs-verse') || {}).value, 10) || null;
        const content = ((document.getElementById('cs-content') || {}).value || '').trim();
        const msg = document.getElementById('cs-msg');
        const btn = document.getElementById('cs-btn');

        if (!content || content.length < 10) {
            if (msg) { msg.textContent = '⚠️ O estudo precisa ter pelo menos 10 caracteres'; msg.className = 'login-msg error'; }
            return;
        }

        const token = localStorage.getItem('bj_session_token');
        if (!token) {
            if (msg) { msg.textContent = '⚠️ Você precisa estar logado'; msg.className = 'login-msg error'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Publicando...'; }

        try {
            const backendBase = window.BACKEND_URL || '';
            const body = { type: 'study', content, title: title.trim() };
            if (book) { body.bible_book = book; body.bible_chapter = chapter; body.bible_verse = verse; }

            const res = await fetch(`${backendBase}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }

            if (msg) { msg.textContent = '✅ Estudo publicado!'; msg.className = 'login-msg success'; }
            setTimeout(() => {
                const m = document.getElementById('create-study-modal');
                if (m) m.classList.add('hidden');
                // Limpar campos
                ['cs-title','cs-book','cs-chapter','cs-verse','cs-content'].forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                loadCommunityStudies(1);
            }, 1200);
        } catch (e) {
            if (msg) { msg.textContent = `❌ ${e.message}`; msg.className = 'login-msg error'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '📖 Publicar estudo'; }
        }
    }

    function filterCommunityStudies() {
        // Reinicia a lista com filtro aplicado (loadCommunityStudies aplica o filtro internamente)
        loadCommunityStudies(1);
    }

    return {
        init,
        applyFilters,
        openInBible,
        toggleNote,
        saveNote,
        loadCommunityStudies,
        filterCommunityStudies,
        showCreateStudyModal,
        submitCreateStudy
    };
})();
