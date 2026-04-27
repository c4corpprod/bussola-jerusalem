/* ============================================================
   bible.js — Bíblia Interlinear (Todas as traduções)
   Bússola para Jerusalém — C4 Corporation
   ============================================================ */

const Bible = (() => {
    const cache = {};
    let currentBook = 1;
    let currentChapter = 1;
    let totalChapters = 50;
    const layers = { original: true, translit: true, pt: true, en: true };

    let selectedOriginal = 'WLC';
    let selectedOriginalNT = 'SBLGNT';
    let selectedOriginalDeut = 'LXX';
    let selectedTranslit = 'WLC_TRANSLIT';
    let selectedTranslitNT = 'SBLGNT_TRANSLIT';
    let selectedTranslitDeut = 'LXX_TRANSLIT';
    let selectedPT = 'ARA';
    let selectedEN = 'KJV';
    let searchRunId = 0;
    let highlightVerse = null;
    let dailyVerseRef = null;

    // ── localStorage keys ──────────────────────────────────────────
    const BK_KEY   = 'bj_bookmarks';
    const HL_KEY   = 'bj_highlights';
    const HIST_KEY = 'bj_history';
    const FS_KEY   = 'bj_fontsize';
    let bibleFontSize = parseInt(localStorage.getItem(FS_KEY) || '16');
    let _bkCache = null, _hlCache = null;

    // ── Bookmarks ──────────────────────────────────────────────────
    function _loadBK() {
        if (!_bkCache) try { _bkCache = JSON.parse(localStorage.getItem(BK_KEY) || '[]'); } catch { _bkCache = []; }
        return _bkCache;
    }
    function _saveBK(a) { _bkCache = a; localStorage.setItem(BK_KEY, JSON.stringify(a)); _updateBKCount(); }
    function _loadHL() {
        if (!_hlCache) try { _hlCache = JSON.parse(localStorage.getItem(HL_KEY) || '{}'); } catch { _hlCache = {}; }
        return _hlCache;
    }
    function _saveHL(o) { _hlCache = o; localStorage.setItem(HL_KEY, JSON.stringify(o)); }
    function _vid(b, c, v) { return `${b}_${c}_${v}`; }

    function toggleBookmark(b, c, v, text) {
        const arr = _loadBK().slice();
        const id = _vid(b, c, v);
        const idx = arr.findIndex(x => x.id === id);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.unshift({ id, book: b, chapter: c, verse: v, text: (text || '').slice(0, 140), bookName: BOOK_NAMES_PT[b] || ('Livro ' + b), ts: Date.now() });
        _saveBK(arr);
        const btn = document.querySelector(`.verse-bk-btn[data-vid="${id}"]`);
        if (btn) { const now = idx < 0; btn.classList.toggle('active', now); btn.title = now ? 'Remover marcador' : 'Marcar versículo'; }
        showBibleToast(idx >= 0 ? '🔖 Marcador removido' : '🔖 Versículo marcado!');
        return idx < 0;
    }
    function _updateBKCount() {
        const el = document.getElementById('bible-bookmark-count');
        if (el) el.textContent = _loadBK().length || '';
    }

    // ── Highlights ─────────────────────────────────────────────────
    function getHighlight(b, c, v) { return _loadHL()[_vid(b, c, v)] || null; }
    function setHighlight(b, c, v, color) {
        const o = Object.assign({}, _loadHL());
        const id = _vid(b, c, v);
        if (color) o[id] = color; else delete o[id];
        _saveHL(o);
        const block = document.querySelector(`.bible-verse-block[data-vid="${id}"]`);
        if (block) {
            block.classList.remove('hl-gold', 'hl-green', 'hl-blue', 'hl-pink');
            if (color) block.classList.add('hl-' + color);
        }
    }
    function toggleHlPicker(btn) {
        document.querySelectorAll('.verse-hl-picker.open').forEach(p => p.classList.remove('open'));
        btn.nextElementSibling.classList.toggle('open');
    }
    function closeHlPicker(btn) {
        btn.closest('.verse-hl-picker')?.classList.remove('open');
    }

    // ── Copy ───────────────────────────────────────────────────────
    function copyVerse(b, c, v, text) {
        const ref = `${BOOK_NAMES_PT[b] || ('Livro ' + b)} ${c}:${v}`;
        const full = `"${text}" — ${ref}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(full).then(() => showBibleToast('📋 Versículo copiado!')).catch(() => _copyFallback(full));
        } else { _copyFallback(full); }
    }
    function _copyFallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showBibleToast('📋 Versículo copiado!');
    }

    // ── Toast ──────────────────────────────────────────────────────
    function showBibleToast(msg) {
        let t = document.getElementById('bible-toast');
        if (!t) { t = document.createElement('div'); t.id = 'bible-toast'; t.className = 'bible-toast'; document.body.appendChild(t); }
        t.textContent = msg; t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ── History ────────────────────────────────────────────────────
    function _addToHistory(book, chapter) {
        try {
            const h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]').filter(x => !(x.book === book && x.chapter === chapter));
            h.unshift({ book, chapter, name: `${BOOK_NAMES_PT[book] || ('Livro ' + book)} ${chapter}`, ts: Date.now() });
            localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 20)));
        } catch {}
    }
    function _loadHistory() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; } }
    function _renderHistoryChips() {
        const el = document.getElementById('bible-history-chips');
        if (!el) return;
        const hist = _loadHistory().slice(0, 10);
        el.innerHTML = hist.length
            ? hist.map(h => `<button class="bible-hist-chip" onclick="Bible.goToHistChapter(${h.book},${h.chapter})">${h.name}</button>`).join('')
            : '<span class="bible-hist-empty">Nenhum histórico ainda</span>';
    }
    function goToHistChapter(book, chapter) {
        closeJumpPanel();
        currentBook = book; currentChapter = chapter;
        buildBookSelector(); buildChapterSelector(); buildAllSelectors();
        renderChapter();
    }

    // ── Font Size ──────────────────────────────────────────────────
    function applyFontSize() {
        const el = document.getElementById('bible-verses');
        if (el) el.style.fontSize = bibleFontSize + 'px';
        localStorage.setItem(FS_KEY, bibleFontSize);
        const lbl = document.getElementById('bible-font-label');
        if (lbl) lbl.textContent = bibleFontSize + 'px';
    }
    function changeFontSize(delta) {
        bibleFontSize = Math.min(26, Math.max(12, bibleFontSize + delta));
        applyFontSize();
    }

    // ── Jump to Ref ────────────────────────────────────────────────
    function openJumpPanel() {
        const panel = document.getElementById('bible-jump-panel');
        if (!panel) return;
        panel.style.display = 'block';
        _renderHistoryChips();
        setTimeout(() => document.getElementById('bible-jump-input')?.focus(), 50);
    }
    function closeJumpPanel() {
        const panel = document.getElementById('bible-jump-panel');
        if (panel) panel.style.display = 'none';
    }
    function jumpToRef() {
        const input = document.getElementById('bible-jump-input');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;
        const match = raw.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
        if (!match) { showBibleToast('⚠️ Ex: João 3:16 ou Gênesis 1'); return; }
        const bookStr = match[1].trim();
        const ch = parseInt(match[2]);
        const vs = parseInt(match[3] || '1');
        const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const bookIdx = BOOK_NAMES_PT.findIndex((name, i) => i > 0 && norm(name).startsWith(norm(bookStr)));
        if (bookIdx <= 0) { showBibleToast('⚠️ Livro não encontrado: ' + match[1]); return; }
        input.value = '';
        closeJumpPanel();
        goToVerse(bookIdx, ch, vs);
    }

    // ── Bookmarks Drawer ───────────────────────────────────────────
    function openBookmarksDrawer() {
        const list = document.getElementById('bible-bookmarks-list');
        const overlay = document.getElementById('bible-bookmarks-overlay');
        const drawer = document.getElementById('bible-bookmarks-drawer');
        if (!list || !overlay || !drawer) return;
        const arr = _loadBK();
        list.innerHTML = arr.length
            ? arr.map(item => `
                <div class="bible-bk-item" onclick="Bible.goToBK(${item.book},${item.chapter},${item.verse})">
                    <div class="bible-bk-ref">📍 ${item.bookName} ${item.chapter}:${item.verse}</div>
                    <div class="bible-bk-text">${item.text}</div>
                    <button class="bible-bk-del" onclick="event.stopPropagation();Bible.deleteBK('${item.id}')" title="Remover">✕</button>
                </div>`).join('')
            : '<p class="bible-bk-empty">Nenhum marcador ainda.<br><small>Toque em 🔖 em qualquer versículo.</small></p>';
        overlay.style.display = 'block';
        drawer.style.display = 'flex';
        requestAnimationFrame(() => drawer.classList.add('open'));
    }
    function closeBookmarksDrawer() {
        const drawer = document.getElementById('bible-bookmarks-drawer');
        const overlay = document.getElementById('bible-bookmarks-overlay');
        if (drawer) { drawer.classList.remove('open'); setTimeout(() => drawer.style.display = 'none', 300); }
        if (overlay) overlay.style.display = 'none';
    }
    function goToBK(b, c, v) { closeBookmarksDrawer(); goToVerse(b, c, v); }
    function deleteBK(id) { _saveBK(_loadBK().filter(x => x.id !== id)); openBookmarksDrawer(); }

    // ── Focus Mode Overlay ─────────────────────────────────────────
    let _focusMode = false;

    function toggleReadingMode() {
        if (_focusMode) closeFocusMode(); else openFocusMode();
    }

    function openFocusMode() {
        _focusMode = true;
        const overlay = document.getElementById('bible-focus-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        const btn = document.getElementById('bible-reading-mode-btn');
        if (btn) { btn.classList.add('active'); btn.title = 'Fechar modo foco'; }
        _buildFocusBookSelect();
        _buildFocusChapterSelect();
        _buildFocusTransSelects();
        _syncFocusLayerChecks();
        overlay.classList.toggle('sepia-mode', _sepiaMode);
        const sb = document.getElementById('bible-focus-sepia-btn');
        if (sb) sb.classList.toggle('active', _sepiaMode);
        _syncFocusVerses();
        showBibleToast('📖 Modo foco ativado — Esc para sair');
    }

    function closeFocusMode() {
        _focusMode = false;
        const overlay = document.getElementById('bible-focus-overlay');
        if (overlay) {
            overlay.classList.add('focus-closing');
            setTimeout(() => { overlay.style.display = 'none'; overlay.classList.remove('focus-closing'); }, 290);
        }
        document.body.style.overflow = '';
        const btn = document.getElementById('bible-reading-mode-btn');
        if (btn) { btn.classList.remove('active'); btn.title = 'Modo foco'; }
        showBibleToast('📖 Modo foco desativado');
    }

    function _syncFocusVerses() {
        const src = document.getElementById('bible-verses');
        const dst = document.getElementById('bible-focus-verses');
        if (src && dst) { dst.innerHTML = src.innerHTML; dst.scrollTop = 0; }
        const ref = document.getElementById('bible-current-ref');
        const fref = document.getElementById('bible-focus-ref');
        if (ref && fref) fref.textContent = ref.textContent;
    }

    function _buildFocusBookSelect() {
        const main = document.getElementById('bible-book-select');
        const focus = document.getElementById('focus-book-select');
        if (main && focus) { focus.innerHTML = main.innerHTML; focus.value = currentBook; }
    }

    function _buildFocusChapterSelect() {
        const main = document.getElementById('bible-chapter-select');
        const focus = document.getElementById('focus-chapter-select');
        if (main && focus) { focus.innerHTML = main.innerHTML; focus.value = currentChapter; }
    }

    function _buildFocusTransSelects() {
        ['original', 'translit', 'pt', 'en'].forEach(layer => {
            const main = document.getElementById(`bible-select-${layer}`);
            const focus = document.getElementById(`focus-select-${layer}`);
            if (main && focus) { focus.innerHTML = main.innerHTML; focus.value = main.value; }
        });
    }

    function _syncFocusLayerChecks() {
        ['original', 'translit', 'pt', 'en'].forEach(layer => {
            const mainCk = document.getElementById(`layer-${layer}`);
            const focusCk = document.getElementById(`focus-layer-${layer}`);
            if (mainCk && focusCk) focusCk.checked = mainCk.checked;
        });
    }

    function focusChangeBook(val) {
        const s = document.getElementById('bible-book-select');
        if (s) { s.value = val; s.dispatchEvent(new Event('change')); }
    }

    function focusChangeChapter(val) {
        const s = document.getElementById('bible-chapter-select');
        if (s) { s.value = val; s.dispatchEvent(new Event('change')); }
    }

    function focusChangeTrans(layer, val) {
        const s = document.getElementById(`bible-select-${layer}`);
        if (s) { s.value = val; s.dispatchEvent(new Event('change')); }
    }

    // ── Sépia Mode ──────────────────────────────────────────────────
    let _sepiaMode = localStorage.getItem('bj_sepia') === '1';
    function _applySepia() {
        const section = document.querySelector('.bible-section');
        const btn = document.getElementById('bible-sepia-btn');
        if (section) section.classList.toggle('sepia-mode', _sepiaMode);
        if (btn) { btn.classList.toggle('active', _sepiaMode); btn.title = _sepiaMode ? 'Desativar sépia' : 'Modo sépia'; }
        // Espelhar no overlay de foco
        const fo = document.getElementById('bible-focus-overlay');
        if (fo) fo.classList.toggle('sepia-mode', _sepiaMode);
        const fsb = document.getElementById('bible-focus-sepia-btn');
        if (fsb) fsb.classList.toggle('active', _sepiaMode);
    }
    function toggleSepia() {
        _sepiaMode = !_sepiaMode;
        localStorage.setItem('bj_sepia', _sepiaMode ? '1' : '0');
        _applySepia();
        showBibleToast(_sepiaMode ? '🌙 Modo sépia ativado' : '☀️ Modo sépia desativado');
    }

    // ── TTS (Leitura em Voz Alta) ──────────────────────────────────
    let _ttsActive = false;
    let _ttsUtterance = null;
    function toggleTTS() {
        if (_ttsActive) { _stopTTS(); return; }
        _startTTS();
    }
    function _startTTS() {
        if (!window.speechSynthesis) { showBibleToast('⚠️ Voz não disponível neste navegador'); return; }
        window.speechSynthesis.cancel();
        // Coletar texto do capítulo atual (somente textos em pt)
        const verses = document.querySelectorAll('.bible-verse-block');
        if (!verses.length) { showBibleToast('⚠️ Nenhum texto carregado'); return; }
        let text = '';
        verses.forEach(v => {
            const ptEl = v.querySelector('.pt-text');
            if (ptEl) text += ptEl.textContent.trim() + ' ';
        });
        if (!text.trim()) { showBibleToast('⚠️ Ative a camada Português para ouvir'); return; }
        _ttsUtterance = new SpeechSynthesisUtterance(text);
        _ttsUtterance.lang = 'pt-BR';
        _ttsUtterance.rate = 0.9;
        _ttsUtterance.pitch = 1;
        // Preferir voz pt-BR se disponível
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang === 'pt-BR') || voices.find(v => v.lang.startsWith('pt'));
        if (ptVoice) _ttsUtterance.voice = ptVoice;
        _ttsUtterance.onend = () => _stopTTS();
        _ttsUtterance.onerror = () => _stopTTS();
        _ttsActive = true;
        _updateTTSBtn();
        window.speechSynthesis.speak(_ttsUtterance);
        showBibleToast('🔊 Leitura iniciada');
    }
    function _stopTTS() {
        window.speechSynthesis?.cancel();
        _ttsActive = false;
        _ttsUtterance = null;
        _updateTTSBtn();
    }
    function _updateTTSBtn() {
        const btn = document.getElementById('bible-tts-btn');
        if (!btn) return;
        if (_ttsActive) { btn.textContent = '⏹'; btn.classList.add('active'); btn.title = 'Parar leitura'; }
        else { btn.textContent = '🔊'; btn.classList.remove('active'); btn.title = 'Ouvir capítulo'; }
    }

    const CATALOG = {
        hebraico: {
            label: '📜 Hebraico (AT)',
            items: [
                { id: 'WLC', name: 'WLC — Westminster Leningrad Codex' },
                { id: 'WLCa', name: 'WLCa — WLC acentuado' },
                { id: 'WLCC', name: 'WLCC — WLC Consonantal' },
                { id: 'HAC', name: 'HAC — Aleppo Codex' },
            ]
        },
        grego_at: {
            label: '📜 Grego AT (Septuaginta)',
            items: [
                { id: 'LXX', name: 'LXX — Septuaginta' },
                { id: 'LXXE', name: 'LXXE — Septuaginta (EN)' },
            ]
        },
        grego_nt: {
            label: '✝️ Grego (NT)',
            items: [
                { id: 'SBLGNT', name: 'SBLGNT — SBL Greek NT' },
                { id: 'BYZ', name: 'BYZ — Bizantino' },
                { id: 'TR', name: 'TR — Textus Receptus' },
                { id: 'TISCH', name: 'TISCH — Tischendorf' },
                { id: 'NTGT', name: 'NTGT — NT Grego' },
                { id: 'DHNT', name: 'DHNT — Delitzsch Hebrew NT' },
            ]
        },
        aramaico: {
            label: '📜 Aramaico / Siríaco',
            items: [
                { id: 'PESHITTA', name: 'PESHITTA — Peshitta (parcial)' },
                { id: 'TARGUM_ONKELOS', name: 'TARGUM — Targum Onkelos (Pent.)' },
            ]
        },
        latim: {
            label: '⛪ Latim',
            items: [
                { id: 'VULG', name: 'VULG — Vulgata Latina' },
                { id: 'DRB', name: 'DRB — Douay-Rheims' },
            ]
        },
        transliteracoes: {
            label: '🔤 Transliterações',
            items: [
                { id: 'WLC_TRANSLIT', name: 'Hebraico WLC' },
                { id: 'WLCC_TRANSLIT', name: 'Hebraico Consonantal' },
                { id: 'HAC_TRANSLIT', name: 'Aleppo Codex' },
                { id: 'SBLGNT_TRANSLIT', name: 'Grego SBLGNT' },
                { id: 'BYZ_TRANSLIT', name: 'Bizantino' },
                { id: 'TR_TRANSLIT', name: 'Textus Receptus' },
                { id: 'DHNT_TRANSLIT', name: 'Delitzsch HNT' },
                { id: 'LXX_TRANSLIT', name: 'Septuaginta' },
                { id: 'PESHITTA_TRANSLIT', name: 'Peshitta' },
                { id: 'TARGUM_TRANSLIT', name: 'Targum' },
                { id: 'VULG_TRANSLIT', name: 'Vulgata' },
            ]
        },
        portugues: {
            label: '🇧🇷 Português',
            items: [
                { id: 'ARA', name: 'ARA — Almeida Rev. Atualizada' },
                { id: 'ARC09', name: 'ARC09 — Almeida Rev. Corrigida' },
                { id: 'ACF11', name: 'ACF11 — Almeida Corrigida Fiel' },
                { id: 'NAA', name: 'NAA — Nova Almeida Atualizada' },
                { id: 'NVT', name: 'NVT — Nova Versão Transformadora' },
                { id: 'NTLH', name: 'NTLH — Nova Trad. Ling. de Hoje' },
                { id: 'NVIPT', name: 'NVIPT — NVI Português' },
                { id: 'CNBB', name: 'CNBB — CNBB (Católica)' },
                { id: 'NBV07', name: 'NBV07 — Nova Bíblia Viva' },
                { id: 'TB10', name: 'TB10 — Tradução Brasileira' },
                { id: 'KJA', name: 'KJA — King James Atualizada PT' },
                { id: 'ALM21', name: 'ALM21 — Almeida Séc. 21' },
                { id: 'OL', name: 'OL — O Livro' },
                { id: 'VFL', name: 'VFL — Versão Fácil de Ler' },
                { id: 'LBP', name: 'LBP — A Bíblia para Todos' },
                { id: 'MENS', name: 'MENS — A Mensagem' },
                { id: 'AUV', name: 'AUV — Almeida Ultratextual' },
                { id: 'SPE', name: 'SPE — Samaritano Pent. (1-5)' },
            ]
        },
        ingles: {
            label: '🇺🇸 Inglês',
            items: [
                { id: 'KJV', name: 'KJV — King James Version' },
                { id: 'NKJV', name: 'NKJV — New King James' },
                { id: 'NIV', name: 'NIV — New International' },
                { id: 'NIV2011', name: 'NIV2011 — NIV 2011' },
                { id: 'ESV', name: 'ESV — English Standard' },
                { id: 'NASB', name: 'NASB — New American Standard' },
                { id: 'NLT', name: 'NLT — New Living Translation' },
                { id: 'AMP', name: 'AMP — Amplified Bible' },
                { id: 'MSG', name: 'MSG — The Message' },
                { id: 'CSB17', name: 'CSB17 — Christian Standard' },
                { id: 'LSB', name: 'LSB — Legacy Standard' },
                { id: 'BSB', name: 'BSB — Berean Standard' },
                { id: 'ASV', name: 'ASV — American Standard' },
                { id: 'WEB', name: 'WEB — World English Bible' },
                { id: 'YLT', name: "YLT — Young's Literal" },
                { id: 'ERV', name: 'ERV — Easy-to-Read' },
                { id: 'GNV', name: 'GNV — Geneva Bible' },
                { id: 'ISV', name: 'ISV — International Standard' },
                { id: 'LSV', name: 'LSV — Literal Standard' },
                { id: 'MEV', name: 'MEV — Modern English' },
                { id: 'NET', name: 'NET — NET Bible' },
                { id: 'NLV', name: 'NLV — New Life Version' },
                { id: 'RSV', name: 'RSV — Revised Standard' },
                { id: 'CEB', name: 'CEB — Common English Bible' },
                { id: 'GNT', name: 'GNT — Good News Translation' },
            ]
        },
        outras: {
            label: '🌍 Outras Línguas',
            items: [
                { id: 'NR06', name: 'NR06 — Nuova Riveduta (IT)' },
                { id: 'NLD', name: 'NLD — Holandês' },
                { id: 'CEVD', name: 'CEVD — Contemporary English' },
                { id: 'GNTD', name: 'GNTD — Good News Deuterocanon' },
                { id: 'NABRE', name: 'NABRE — New American Católica' },
                { id: 'NJB1985', name: 'NJB — New Jerusalem Bible' },
                { id: 'NRSVCE', name: 'NRSVCE — NRSV Catholic Ed.' },
                { id: 'RSV2CE', name: 'RSV2CE — RSV 2nd Catholic Ed.' },
            ]
        },
        judaicas: {
            label: '✡ Messiânica / Judaica',
            items: [
                { id: 'CJB', name: 'CJB — Complete Jewish Bible' },
                { id: 'TLV', name: 'TLV — Tree of Life Version' },
                { id: 'TS2009', name: 'TS2009 — The Scriptures 2009' },
                { id: 'SEF_BJC', name: 'SEF_BJC — Sefaria (parcial)' },
                { id: 'SEF_SPS', name: 'SEF_SPS — Sefaria Sidur (parcial)' },
                { id: 'SEF_TCP', name: 'SEF_TCP — Sefaria TCP (parcial)' },
            ]
        }
    };

    const BOOK_NAMES_PT = [
        '', 'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
        'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
        '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
        'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
        'Eclesiastes', 'Cânticos', 'Isaías', 'Jeremias', 'Lamentações',
        'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós',
        'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque',
        'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
        'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
        'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
        'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses',
        '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus',
        'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João',
        '3 João', 'Judas', 'Apocalipse',
        // Deuterocanônicos (67-88)
        '1 Esdras', 'Tobias', 'Judite', 'Sabedoria', 'Eclesiástico',
        'Baruc', 'Baruc/Ep. Jeremias', '1 Macabeus', '2 Macabeus', '3 Macabeus',
        '4 Macabeus', 'Oração de Manassés', 'Salmo 151', '4 Esdras', 'Odes',
        'Salmos de Salomão', 'Oração Manassés', 'Susana', 'Bel e o Dragão',
        'Adições a Ester', 'Adições a Daniel', 'Cântico dos 3 Jovens'
    ];

    const CHAPTERS = [
        0, 50, 40, 27, 36, 34, 24, 21, 4, 31, 24,
        22, 25, 29, 36, 10, 13, 10, 42, 150, 31,
        12, 8, 66, 52, 5, 48, 12, 14, 3, 9,
        1, 4, 7, 3, 3, 3, 2, 14, 4,
        28, 16, 24, 21, 28, 16, 16, 13, 6, 6,
        4, 4, 5, 3, 6, 4, 3, 1, 13,
        5, 5, 3, 5, 1, 1, 1, 22,
        // Deuterocanônicos (67-88)
        15, 14, 16, 19, 51, 1, 6, 16, 15, 7,
        16, 2, 1, 18, 16, 1, 1, 1, 18, 14, 1, 1
    ];

    const RTL = new Set(['WLC','WLCa','WLCC','HAC','PESHITTA','TARGUM_ONKELOS']);
    function isOT(b) { return b >= 1 && b <= 39; }
    function isNT(b) { return b >= 40 && b <= 66; }
    function isDeut(b) { return b >= 67; }
    const MAX_BOOK = 88;

    // CDN base — dados hospedados no GitHub via jsDelivr
    const CDN_BASE = 'https://cdn.jsdelivr.net/gh/Kaibadara/bussola-jerusalem@main/www/data/bibles';

    async function loadBook(tr, bookNum) {
        const k = `${tr}/${bookNum}`;
        if (cache[k]) return cache[k];
        try {
            const r = await fetch(`${CDN_BASE}/${tr}/${bookNum}.json`);
            if (!r.ok) return null;
            cache[k] = await r.json();
            return cache[k];
        } catch { return null; }
    }

    function versesOf(data, ch) { return data ? data.filter(v => v.chapter === ch) : []; }

    function normalizeText(str) {
        return (str || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function getDayOfYear() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        return Math.floor(diff / 86400000);
    }

    function buildBookSelector() {
        const s = document.getElementById('bible-book-select');
        if (!s) return;
        s.innerHTML = '';
        [['📜 Antigo Testamento', 1, 39], ['✝️ Novo Testamento', 40, 66],
         ['📗 Deuterocanônicos', 67, 88]].forEach(([lbl, a, b]) => {
            const g = document.createElement('optgroup'); g.label = lbl;
            for (let i = a; i <= b; i++) {
                if (!BOOK_NAMES_PT[i]) continue;
                const o = document.createElement('option');
                o.value = i; o.textContent = BOOK_NAMES_PT[i];
                if (i === currentBook) o.selected = true;
                g.appendChild(o);
            }
            s.appendChild(g);
        });
    }

    function buildChapterSelector() {
        const s = document.getElementById('bible-chapter-select');
        if (!s) return;
        s.innerHTML = '';
        totalChapters = CHAPTERS[currentBook] || 1;
        for (let i = 1; i <= totalChapters; i++) {
            const o = document.createElement('option');
            o.value = i; o.textContent = `Cap. ${i}`;
            if (i === currentChapter) o.selected = true;
            s.appendChild(o);
        }
    }

    function buildSelect(id, cats, val) {
        const s = document.getElementById(id);
        if (!s) return;
        s.innerHTML = '';
        cats.forEach(ck => {
            const c = CATALOG[ck]; if (!c) return;
            const g = document.createElement('optgroup'); g.label = c.label;
            c.items.forEach(t => {
                const o = document.createElement('option');
                o.value = t.id; o.textContent = t.name;
                if (t.id === val) o.selected = true;
                g.appendChild(o);
            });
            s.appendChild(g);
        });
    }

    function buildAllSelectors() {
        if (isDeut(currentBook)) {
            buildSelect('bible-select-original',
                ['grego_at','latim'],
                selectedOriginalDeut);
            buildSelect('bible-select-translit', ['transliteracoes'],
                selectedTranslitDeut);
            buildSelect('bible-select-pt', ['portugues'], selectedPT);
            buildSelect('bible-select-en', ['ingles','outras'], selectedEN);
        } else {
            buildSelect('bible-select-original',
                ['hebraico','grego_at','grego_nt','aramaico','latim','judaicas'],
                isOT(currentBook) ? selectedOriginal : selectedOriginalNT);
            buildSelect('bible-select-translit', ['transliteracoes'],
                isOT(currentBook) ? selectedTranslit : selectedTranslitNT);
            buildSelect('bible-select-pt', ['portugues','judaicas'], selectedPT);
            buildSelect('bible-select-en', ['ingles','outras'], selectedEN);
        }
    }

    function cleanBibleText(text) {
        if (!text) return '';
        return text
            .replace(/<S>\d+<\/S>/g, '')      // Remove Strong's numbers <S>1234</S>
            .replace(/<sup>[^<]*<\/sup>/g, '') // Remove footnotes <sup>...</sup>
            .replace(/^\d+\s+/, '')             // Remove leading verse numbers
            .replace(/\s{2,}/g, ' ')            // Clean double spaces
            .trim();
    }

    async function renderChapter() {
        const box = document.getElementById('bible-verses');
        if (!box) return;
        box.innerHTML = '<div class="bible-loading"><div class="bible-loading-star">✡</div><p>Carregando Escrituras...</p></div>';

        const bk = currentBook, ch = currentChapter;
        const oK = isDeut(bk) ? selectedOriginalDeut : isOT(bk) ? selectedOriginal : selectedOriginalNT;
        const tK = isDeut(bk) ? selectedTranslitDeut : isOT(bk) ? selectedTranslit : selectedTranslitNT;
        const dir = RTL.has(oK) ? 'rtl' : 'ltr';

        const [oD, tD, pD, eD] = await Promise.all([
            loadBook(oK, bk), loadBook(tK, bk),
            loadBook(selectedPT, bk), loadBook(selectedEN, bk)
        ]);

        const oV = versesOf(oD, ch), tV = versesOf(tD, ch);
        const pV = versesOf(pD, ch), eV = versesOf(eD, ch);
        const base = pV.length ? pV : eV.length ? eV : oV.length ? oV : [];

        if (!base.length) {
            box.innerHTML = '<div class="bible-empty"><p>📜 Capítulo não disponível nesta tradução.</p></div>';
            return;
        }

        let h = `<div class="bible-chapter-header">
            <div class="ornament">─── ✡ ───</div>
            <h3>${BOOK_NAMES_PT[bk]||'Livro '+bk} ${ch}</h3>
            <div class="ornament">─── ✡ ───</div></div>`;

        const bkSet = new Set(_loadBK().map(x => x.id));
        const hlMap = _loadHL();

        for (const v of base) {
            const n = v.verse;
            const o = oV.find(x => x.verse === n);
            const t = tV.find(x => x.verse === n);
            const p = pV.find(x => x.verse === n);
            const e = eV.find(x => x.verse === n);
            const isHighlighted = highlightVerse === n;
            const vid = _vid(bk, ch, n);
            const bkd = bkSet.has(vid);
            const hlColor = hlMap[vid] || '';
            const mainText = cleanBibleText((p || e || o || { text: '' }).text);
            const mainTextEsc = mainText.replace(/`/g, "'").replace(/\\/g, '\\\\');
            const bookNameEsc = (BOOK_NAMES_PT[bk] || ('Livro ' + bk)).replace(/'/g, "\\'");
            h += `<div class="bible-verse-block ${isHighlighted ? 'bible-verse-highlight' : ''} ${hlColor ? 'hl-' + hlColor : ''}" data-verse="${n}" data-vid="${vid}"><div class="verse-number">${n}</div><div class="verse-lines">`;
            if (o) h += `<div class="verse-line verse-original" dir="${dir}" style="${layers.original ? '' : 'display:none'}"><span class="verse-lang-tag">${oK}</span><span class="verse-text original-text">${cleanBibleText(o.text)}</span></div>`;
            if (t) h += `<div class="verse-line verse-translit" style="${layers.translit ? '' : 'display:none'}"><span class="verse-lang-tag">Translit.</span><span class="verse-text translit-text">${cleanBibleText(t.text)}</span></div>`;
            if (p) h += `<div class="verse-line verse-pt" style="${layers.pt ? '' : 'display:none'}"><span class="verse-lang-tag">${selectedPT}</span><span class="verse-text pt-text">${cleanBibleText(p.text)}</span></div>`;
            if (e) h += `<div class="verse-line verse-en" style="${layers.en ? '' : 'display:none'}"><span class="verse-lang-tag">${selectedEN}</span><span class="verse-text en-text">${cleanBibleText(e.text)}</span></div>`;
            h += `</div>
            <div class="verse-actions">
                <button class="verse-action-btn verse-bk-btn ${bkd ? 'active' : ''}" data-vid="${vid}" title="${bkd ? 'Remover marcador' : 'Marcar versículo'}" onclick="Bible.toggleBookmark(${bk},${ch},${n},\`${mainTextEsc}\`)">🔖</button>
                <div class="verse-hl-wrap">
                    <button class="verse-action-btn verse-hl-btn" title="Destacar" onclick="Bible.toggleHlPicker(this)">🎨</button>
                    <div class="verse-hl-picker">
                        <button class="hl-dot hl-gold" onclick="Bible.setHighlight(${bk},${ch},${n},'gold');Bible.closeHlPicker(this)" title="Dourado"></button>
                        <button class="hl-dot hl-green" onclick="Bible.setHighlight(${bk},${ch},${n},'green');Bible.closeHlPicker(this)" title="Verde"></button>
                        <button class="hl-dot hl-blue" onclick="Bible.setHighlight(${bk},${ch},${n},'blue');Bible.closeHlPicker(this)" title="Azul"></button>
                        <button class="hl-dot hl-pink" onclick="Bible.setHighlight(${bk},${ch},${n},'pink');Bible.closeHlPicker(this)" title="Rosa"></button>
                        <button class="hl-dot hl-none" onclick="Bible.setHighlight(${bk},${ch},${n},null);Bible.closeHlPicker(this)" title="Remover">✕</button>
                    </div>
                </div>
                <button class="verse-action-btn verse-copy-btn" title="Copiar versículo" onclick="Bible.copyVerse(${bk},${ch},${n},\`${mainTextEsc}\`)">📋</button>
                <button class="verse-action-btn verse-share-btn2" title="Compartilhar na Comunidade" onclick="CommunityModule.shareBibleVerse('${bookNameEsc}',${bk},${ch},${n},\`${mainTextEsc}\`)">📤</button>
            </div></div>`;
        }

        box.innerHTML = h;
        applyFontSize();
        _stopTTS();
        box.scrollTop = 0;
        highlightVerse = null;
        _addToHistory(bk, ch);
        document.querySelectorAll('.verse-hl-picker.open').forEach(p => p.classList.remove('open'));
        const ref = document.getElementById('bible-current-ref');
        if (ref) ref.textContent = `${BOOK_NAMES_PT[bk]||'Livro '+bk} ${ch}`;
        // Atualizar barra de progresso do livro
        const totalChs = CHAPTERS[bk] || 1;
        const pct = Math.round((ch / totalChs) * 100);
        const bar = document.getElementById('bible-progress-bar');
        const lbl = document.getElementById('bible-progress-label');
        if (bar) bar.style.width = pct + '%';
        if (lbl) lbl.textContent = `Cap. ${ch} de ${totalChs} (${pct}%)`;

        // Sincronizar overlay de modo foco
        if (_focusMode) {
            _syncFocusVerses();
            _buildFocusChapterSelect();
            _buildFocusTransSelects();
            _syncFocusLayerChecks();
        }
    }

    async function goToVerse(book, chapter, verse) {
        if (!book || !chapter || !verse) return;
        currentBook = Number(book);
        currentChapter = Number(chapter);
        highlightVerse = Number(verse);

        buildBookSelector();
        buildChapterSelector();
        buildAllSelectors();
        await renderChapter();

        const row = document.querySelector(`#bible-verses .bible-verse-block[data-verse="${verse}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function loadDailyVerse() {
        const textEl = document.getElementById('bible-daily-verse-text');
        const refEl = document.getElementById('bible-daily-verse-ref');
        if (!textEl || !refEl) return;

        textEl.textContent = 'Carregando versículo diário...';
        refEl.textContent = '--';
        dailyVerseRef = null;

        const day = getDayOfYear();
        let book = ((day * 37) % 66) + 1;

        for (let tries = 0; tries < 66; tries++) {
            const chapterCount = CHAPTERS[book] || 1;
            const chapter = ((day * 17 + tries) % chapterCount) + 1;

            const primary = await loadBook(selectedPT, book);
            const fallback = primary ? null : await loadBook('ARA', book);
            const data = primary || fallback;
            const verses = versesOf(data, chapter);

            if (verses.length) {
                const verse = verses[day % verses.length];
                dailyVerseRef = { book, chapter, verse: verse.verse };
                textEl.textContent = cleanBibleText(verse.text);
                refEl.textContent = `${BOOK_NAMES_PT[book] || ('Livro ' + book)} ${chapter}:${verse.verse} (${primary ? selectedPT : 'ARA'})`;
                return;
            }

            book = book >= 66 ? 1 : book + 1;
        }

        textEl.textContent = 'Não foi possível carregar o versículo diário.';
        refEl.textContent = '--';
    }

    async function searchVerses() {
        const input = document.getElementById('bible-search-input');
        const status = document.getElementById('bible-search-status');
        const resultsBox = document.getElementById('bible-search-results');
        if (!input || !status || !resultsBox) return;

        const query = input.value.trim();
        const normalizedQuery = normalizeText(query);
        if (normalizedQuery.length < 3) {
            status.textContent = 'Digite pelo menos 3 caracteres para pesquisar.';
            resultsBox.innerHTML = '';
            return;
        }

        const terms = normalizedQuery.split(/\s+/).filter(Boolean);
        const runId = ++searchRunId;
        const results = [];
        const maxResults = 40;

        status.textContent = `Pesquisando em ${selectedPT}...`;
        resultsBox.innerHTML = '';

        for (let book = 1; book <= 66; book++) {
            if (runId !== searchRunId) return;
            const data = await loadBook(selectedPT, book);
            if (!data || !Array.isArray(data)) continue;

            for (const v of data) {
                const textNorm = normalizeText(v.text);
                const matched = terms.every(t => textNorm.includes(t));
                if (!matched) continue;

                results.push({
                    book,
                    chapter: v.chapter,
                    verse: v.verse,
                    text: v.text
                });

                if (results.length >= maxResults) break;
            }

            if (results.length >= maxResults) break;
            if (book % 4 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (runId !== searchRunId) return;

        if (!results.length) {
            status.textContent = `Nenhum resultado encontrado para "${query}" em ${selectedPT}.`;
            resultsBox.innerHTML = '';
            return;
        }

        status.textContent = `${results.length} resultado(s) encontrado(s) em ${selectedPT}.`;
        resultsBox.innerHTML = results.map(r => {
            const bookName = BOOK_NAMES_PT[r.book] || ('Livro ' + r.book);
            const ref = `${bookName} ${r.chapter}:${r.verse}`;
            return `<button class="bible-search-result-item" data-book="${r.book}" data-chapter="${r.chapter}" data-verse="${r.verse}">
                <span class="bible-search-result-ref">${ref}</span>
                <span class="bible-search-result-text">${r.text}</span>
            </button>`;
        }).join('');
    }

    function clearSearch() {
        const input = document.getElementById('bible-search-input');
        const status = document.getElementById('bible-search-status');
        const resultsBox = document.getElementById('bible-search-results');
        searchRunId++;
        if (input) input.value = '';
        if (status) status.textContent = '';
        if (resultsBox) resultsBox.innerHTML = '';
    }

    function toggleLayer(layer, vis) {
        layers[layer] = vis;
        document.querySelectorAll(`.verse-${layer}`).forEach(el => el.style.display = vis ? '' : 'none');
    }

    function prevChapter() {
        if (currentChapter > 1) currentChapter--;
        else if (currentBook > 1) {
            let prev = currentBook - 1;
            while (prev >= 1 && !BOOK_NAMES_PT[prev]) prev--;
            if (prev >= 1) { currentBook = prev; currentChapter = CHAPTERS[currentBook]; buildBookSelector(); buildAllSelectors(); }
        }
        buildChapterSelector(); renderChapter();
    }

    function nextChapter() {
        if (currentChapter < CHAPTERS[currentBook]) currentChapter++;
        else if (currentBook < MAX_BOOK) {
            // Skip to next existing book
            let next = currentBook + 1;
            while (next <= MAX_BOOK && !BOOK_NAMES_PT[next]) next++;
            if (next <= MAX_BOOK) { currentBook = next; currentChapter = 1; buildBookSelector(); buildAllSelectors(); }
        }
        buildChapterSelector(); renderChapter();
    }

    function init() {
        buildBookSelector();
        buildChapterSelector();
        buildAllSelectors();

        document.getElementById('bible-book-select')?.addEventListener('change', e => {
            currentBook = parseInt(e.target.value); currentChapter = 1;
            buildChapterSelector(); buildAllSelectors(); renderChapter();
        });
        document.getElementById('bible-chapter-select')?.addEventListener('change', e => {
            currentChapter = parseInt(e.target.value); renderChapter();
        });
        document.getElementById('bible-select-original')?.addEventListener('change', e => {
            if (isDeut(currentBook)) selectedOriginalDeut = e.target.value;
            else if (isOT(currentBook)) selectedOriginal = e.target.value;
            else selectedOriginalNT = e.target.value;
            renderChapter();
        });
        document.getElementById('bible-select-translit')?.addEventListener('change', e => {
            if (isDeut(currentBook)) selectedTranslitDeut = e.target.value;
            else if (isOT(currentBook)) selectedTranslit = e.target.value;
            else selectedTranslitNT = e.target.value;
            renderChapter();
        });
        document.getElementById('bible-select-pt')?.addEventListener('change', e => {
            selectedPT = e.target.value;
            renderChapter();
            loadDailyVerse();
        });
        document.getElementById('bible-select-en')?.addEventListener('change', e => { selectedEN = e.target.value; renderChapter(); });

        document.getElementById('bible-prev')?.addEventListener('click', prevChapter);
        document.getElementById('bible-next')?.addEventListener('click', nextChapter);

        document.getElementById('bible-search-btn')?.addEventListener('click', searchVerses);
        document.getElementById('bible-search-clear-btn')?.addEventListener('click', clearSearch);
        document.getElementById('bible-search-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') searchVerses();
        });
        document.getElementById('bible-search-results')?.addEventListener('click', async e => {
            const item = e.target.closest('.bible-search-result-item');
            if (!item) return;
            await goToVerse(item.dataset.book, item.dataset.chapter, item.dataset.verse);
        });

        document.getElementById('bible-daily-open-btn')?.addEventListener('click', async () => {
            if (!dailyVerseRef) return;
            await goToVerse(dailyVerseRef.book, dailyVerseRef.chapter, dailyVerseRef.verse);
        });

        // Jump panel: Enter key
        document.getElementById('bible-jump-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') jumpToRef();
            if (e.key === 'Escape') closeJumpPanel();
        });

        // Close highlight picker on outside click
        document.addEventListener('click', e => {
            if (!e.target.closest('.verse-hl-wrap')) {
                document.querySelectorAll('.verse-hl-picker.open').forEach(p => p.classList.remove('open'));
            }
        });

        // Focus mode keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (!_focusMode) return;
            if (e.key === 'Escape') closeFocusMode();
            if (e.key === 'ArrowLeft'  && !e.target.matches('input,select,textarea')) prevChapter();
            if (e.key === 'ArrowRight' && !e.target.matches('input,select,textarea')) nextChapter();
        });

        applyFontSize();
        _updateBKCount();
        _applySepia();
        renderChapter();
        loadDailyVerse();
    }

    return {
        init, renderChapter, prevChapter, nextChapter, toggleLayer, searchVerses, clearSearch,
        toggleBookmark, setHighlight, toggleHlPicker, closeHlPicker, copyVerse,
        openBookmarksDrawer, closeBookmarksDrawer, goToBK, deleteBK,
        openJumpPanel, closeJumpPanel, jumpToRef, goToHistChapter,
        changeFontSize, toggleReadingMode, toggleSepia, toggleTTS,
        openFocusMode, closeFocusMode,
        focusChangeBook, focusChangeChapter, focusChangeTrans,
        // backward compat (used by old bible-ui-injector versions cached in SW)
        buildBookSelector, buildChapterSelector,
        getState: () => ({ book: currentBook, chapter: currentChapter, bookName: BOOK_NAMES_PT[currentBook] || ('Livro ' + currentBook) })
    };
})();

let bibleInitialized = false;
function initBibleIfNeeded() {
    if (!bibleInitialized) {
        bibleInitialized = true;
        Bible.init();
        BibleOffline.buildList();
        BibleOffline.refreshStockStatus();
    }
}

/* ============================================================
   BibleOffline — Download de Bíblias para uso offline
   ============================================================ */
const BibleOffline = (() => {
    const VERSION_BY_CAT = {
        hebraico: '2026.04.24-he',
        grego: '2026.04.24-gr',
        aramaico: '2026.04.24-ar',
        latim: '2026.04.24-la',
        translit: '2026.04.24-tr',
        portugues: '2026.04.24-pt',
        ingles: '2026.04.24-en',
        judaica: '2026.04.24-jd',
        outras: '2026.04.24-ot',
    };

    const CAT_LABEL = {
        hebraico: 'Hebraico',
        grego: 'Grego',
        aramaico: 'Aramaico',
        latim: 'Latim',
        translit: 'Transliteração',
        portugues: 'Português',
        ingles: 'Inglês',
        judaica: 'Judaica',
        outras: 'Outras',
    };

    const ALL_TRANSLATIONS = [
        { id:'WLC', name:'WLC — Westminster Leningrad', files:39, size:'5.9 MB', cat:'hebraico' },
        { id:'WLCa', name:'WLCa — WLC acentuado', files:39, size:'9.1 MB', cat:'hebraico' },
        { id:'WLCC', name:'WLCC — WLC Consonantal', files:39, size:'3.5 MB', cat:'hebraico' },
        { id:'HAC', name:'HAC — Aleppo Codex', files:39, size:'3.5 MB', cat:'hebraico' },
        { id:'LXX', name:'LXX — Septuaginta', files:52, size:'7.1 MB', cat:'grego' },
        { id:'LXXE', name:'LXXE — Septuaginta EN', files:54, size:'4.7 MB', cat:'grego' },
        { id:'SBLGNT', name:'SBLGNT — Greek NT', files:27, size:'1.9 MB', cat:'grego' },
        { id:'BYZ', name:'BYZ — Bizantino', files:27, size:'1.9 MB', cat:'grego' },
        { id:'TR', name:'TR — Textus Receptus', files:27, size:'1.7 MB', cat:'grego' },
        { id:'TISCH', name:'TISCH — Tischendorf', files:27, size:'3.3 MB', cat:'grego' },
        { id:'NTGT', name:'NTGT — NT Grego', files:27, size:'1.7 MB', cat:'grego' },
        { id:'DHNT', name:'DHNT — Delitzsch HNT', files:27, size:'1.9 MB', cat:'grego' },
        { id:'PESHITTA', name:'PESHITTA — Siríaco (parcial)', files:6, size:'0.5 MB', cat:'aramaico' },
        { id:'TARGUM_ONKELOS', name:'TARGUM — Aramaico (Pent.)', files:5, size:'1.4 MB', cat:'aramaico' },
        { id:'VULG', name:'VULG — Vulgata Latina', files:73, size:'5.1 MB', cat:'latim' },
        { id:'DRB', name:'DRB — Douay-Rheims', files:66, size:'4.9 MB', cat:'latim' },
        { id:'WLC_TRANSLIT', name:'Hebraico WLC translit.', files:39, size:'2.9 MB', cat:'translit' },
        { id:'WLCC_TRANSLIT', name:'Hebraico Cons. translit.', files:39, size:'2.4 MB', cat:'translit' },
        { id:'HAC_TRANSLIT', name:'Aleppo translit.', files:39, size:'2.4 MB', cat:'translit' },
        { id:'SBLGNT_TRANSLIT', name:'Grego SBLGNT translit.', files:27, size:'1.2 MB', cat:'translit' },
        { id:'BYZ_TRANSLIT', name:'Bizantino translit.', files:27, size:'1.2 MB', cat:'translit' },
        { id:'TR_TRANSLIT', name:'Textus Rec. translit.', files:27, size:'1.1 MB', cat:'translit' },
        { id:'DHNT_TRANSLIT', name:'Delitzsch translit.', files:27, size:'1.0 MB', cat:'translit' },
        { id:'LXX_TRANSLIT', name:'Septuaginta translit.', files:52, size:'4.4 MB', cat:'translit' },
        { id:'PESHITTA_TRANSLIT', name:'Peshitta translit.', files:7, size:'0.3 MB', cat:'translit' },
        { id:'TARGUM_TRANSLIT', name:'Targum translit.', files:6, size:'0.8 MB', cat:'translit' },
        { id:'VULG_TRANSLIT', name:'Vulgata translit.', files:75, size:'5.1 MB', cat:'translit' },
        { id:'ARA', name:'ARA — Almeida Rev. Atual.', files:67, size:'4.8 MB', cat:'portugues' },
        { id:'ARC09', name:'ARC09 — Almeida R.C.', files:68, size:'4.9 MB', cat:'portugues' },
        { id:'ACF11', name:'ACF11 — Almeida C. Fiel', files:68, size:'5.0 MB', cat:'portugues' },
        { id:'NAA', name:'NAA — Nova Almeida', files:68, size:'5.2 MB', cat:'portugues' },
        { id:'NVT', name:'NVT — Nova V. Transform.', files:68, size:'5.0 MB', cat:'portugues' },
        { id:'NTLH', name:'NTLH — Nova Trad. LH', files:68, size:'5.1 MB', cat:'portugues' },
        { id:'NVIPT', name:'NVIPT — NVI Português', files:68, size:'4.8 MB', cat:'portugues' },
        { id:'CNBB', name:'CNBB — Católica', files:68, size:'4.7 MB', cat:'portugues' },
        { id:'NBV07', name:'NBV07 — Nova Bíblia Viva', files:68, size:'5.3 MB', cat:'portugues' },
        { id:'TB10', name:'TB10 — Trad. Brasileira', files:68, size:'4.8 MB', cat:'portugues' },
        { id:'KJA', name:'KJA — King James Atual. PT', files:68, size:'5.4 MB', cat:'portugues' },
        { id:'ALM21', name:'ALM21 — Almeida Séc. 21', files:68, size:'4.8 MB', cat:'portugues' },
        { id:'OL', name:'OL — O Livro', files:68, size:'4.9 MB', cat:'portugues' },
        { id:'VFL', name:'VFL — Versão Fácil', files:68, size:'5.1 MB', cat:'portugues' },
        { id:'LBP', name:'LBP — Bíblia p/ Todos', files:68, size:'5.0 MB', cat:'portugues' },
        { id:'MENS', name:'MENS — A Mensagem', files:68, size:'4.6 MB', cat:'portugues' },
        { id:'AUV', name:'AUV — Ultratextual (NT)', files:27, size:'1.7 MB', cat:'portugues' },
        { id:'SPE', name:'SPE — Samaritano (Pent.)', files:5, size:'1.0 MB', cat:'portugues' },
        { id:'KJV', name:'KJV — King James', files:81, size:'9.9 MB', cat:'ingles' },
        { id:'NKJV', name:'NKJV — New King James', files:66, size:'5.1 MB', cat:'ingles' },
        { id:'NIV', name:'NIV — New International', files:66, size:'4.8 MB', cat:'ingles' },
        { id:'NIV2011', name:'NIV2011 — NIV 2011', files:66, size:'4.7 MB', cat:'ingles' },
        { id:'ESV', name:'ESV — English Standard', files:66, size:'4.8 MB', cat:'ingles' },
        { id:'NASB', name:'NASB — New American Std.', files:66, size:'4.9 MB', cat:'ingles' },
        { id:'NLT', name:'NLT — New Living', files:66, size:'5.0 MB', cat:'ingles' },
        { id:'AMP', name:'AMP — Amplified', files:66, size:'5.8 MB', cat:'ingles' },
        { id:'MSG', name:'MSG — The Message', files:66, size:'4.9 MB', cat:'ingles' },
        { id:'CSB17', name:'CSB17 — Christian Std.', files:66, size:'5.4 MB', cat:'ingles' },
        { id:'LSB', name:'LSB — Legacy Standard', files:66, size:'5.2 MB', cat:'ingles' },
        { id:'BSB', name:'BSB — Berean Standard', files:66, size:'4.7 MB', cat:'ingles' },
        { id:'ASV', name:'ASV — American Standard', files:66, size:'8.6 MB', cat:'ingles' },
        { id:'WEB', name:'WEB — World English', files:83, size:'5.9 MB', cat:'ingles' },
        { id:'YLT', name:"YLT — Young's Literal", files:66, size:'5.0 MB', cat:'ingles' },
        { id:'ERV', name:'ERV — Easy-to-Read', files:66, size:'5.3 MB', cat:'ingles' },
        { id:'GNV', name:'GNV — Geneva Bible', files:66, size:'5.0 MB', cat:'ingles' },
        { id:'ISV', name:'ISV — Intl. Standard', files:66, size:'5.8 MB', cat:'ingles' },
        { id:'LSV', name:'LSV — Literal Standard', files:66, size:'5.0 MB', cat:'ingles' },
        { id:'MEV', name:'MEV — Modern English', files:66, size:'4.9 MB', cat:'ingles' },
        { id:'NET', name:'NET — NET Bible', files:66, size:'4.9 MB', cat:'ingles' },
        { id:'NLV', name:'NLV — New Life Version', files:66, size:'4.9 MB', cat:'ingles' },
        { id:'RSV', name:'RSV — Revised Standard', files:66, size:'4.8 MB', cat:'ingles' },
        { id:'CEB', name:'CEB — Common English', files:83, size:'6.0 MB', cat:'ingles' },
        { id:'GNT', name:'GNT — Good News', files:66, size:'4.6 MB', cat:'ingles' },
        { id:'CJB', name:'CJB — Complete Jewish', files:66, size:'5.0 MB', cat:'judaica' },
        { id:'TLV', name:'TLV — Tree of Life', files:66, size:'4.9 MB', cat:'judaica' },
        { id:'TS2009', name:'TS2009 — The Scriptures', files:66, size:'5.0 MB', cat:'judaica' },
        { id:'SEF_BJC', name:'SEF_BJC — Sefaria (parcial)', files:1, size:'5 KB', cat:'judaica' },
        { id:'SEF_SPS', name:'SEF_SPS — Sefaria Sidur (parcial)', files:10, size:'1.3 MB', cat:'judaica' },
        { id:'SEF_TCP', name:'SEF_TCP — Sefaria TCP (parcial)', files:1, size:'5 KB', cat:'judaica' },
        { id:'NR06', name:'NR06 — Nuova Riveduta', files:66, size:'4.9 MB', cat:'outras' },
        { id:'NLD', name:'NLD — Holandês', files:73, size:'5.5 MB', cat:'outras' },
        { id:'CEVD', name:'CEVD — Contemp. English', files:78, size:'5.3 MB', cat:'outras' },
        { id:'GNTD', name:'GNTD — Good News Deut.', files:81, size:'5.7 MB', cat:'outras' },
        { id:'NABRE', name:'NABRE — New American Cat.', files:73, size:'5.8 MB', cat:'outras' },
        { id:'NJB1985', name:'NJB — New Jerusalem', files:73, size:'5.4 MB', cat:'outras' },
        { id:'NRSVCE', name:'NRSVCE — NRSV Catholic', files:73, size:'5.6 MB', cat:'outras' },
        { id:'RSV2CE', name:'RSV2CE — RSV 2nd Cat.', files:73, size:'5.6 MB', cat:'outras' },
    ];

    const ESSENCIAL = ['WLC','SBLGNT','WLC_TRANSLIT','SBLGNT_TRANSLIT','ARA','KJV'];
    let selected = new Set();

    function withVersion(t) {
        return { ...t, version: t.version || VERSION_BY_CAT[t.cat] || '2026.04.24' };
    }

    function getAllTranslations() {
        return ALL_TRANSLATIONS.map(withVersion);
    }

    function swPostRequest(type, payload, expectedType) {
        return new Promise((resolve, reject) => {
            if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
                reject(new Error('Service Worker não disponível'));
                return;
            }
            const timeout = setTimeout(() => {
                navigator.serviceWorker.removeEventListener('message', handler);
                reject(new Error('Timeout na comunicação com Service Worker'));
            }, 20000);

            const handler = (e) => {
                if (!e.data || e.data.type !== expectedType) return;
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve(e.data);
            };

            navigator.serviceWorker.addEventListener('message', handler);
            navigator.serviceWorker.controller.postMessage({ type, ...payload });
        });
    }

    function renderArsenalStock(stock = {}) {
        const box = document.getElementById('bible-arsenal-stock');
        const summary = document.getElementById('bible-offline-summary');
        if (!box || !summary) return;

        const all = getAllTranslations();
        const grouped = {};
        let cachedTotal = 0;
        for (const tr of all) {
            if (!grouped[tr.cat]) grouped[tr.cat] = { total: 0, cached: 0, upToDate: 0 };
            grouped[tr.cat].total += 1;
            const st = stock[tr.id] || { cachedFiles: 0, totalFiles: tr.files, upToDate: false };
            if (st.cachedFiles > 0) grouped[tr.cat].cached += 1;
            if (st.upToDate) grouped[tr.cat].upToDate += 1;
            if (st.cachedFiles > 0) cachedTotal += 1;
        }

        summary.textContent = `Estoque local: ${cachedTotal}/${all.length} versões com conteúdo offline`;
        box.innerHTML = Object.keys(CAT_LABEL).map(cat => {
            const s = grouped[cat] || { total: 0, cached: 0, upToDate: 0 };
            return `<div class="bible-arsenal-item">
                <div class="bible-arsenal-lang">${CAT_LABEL[cat]}</div>
                <div class="bible-arsenal-meta">${s.cached}/${s.total} em cache · ${s.upToDate} atualizadas</div>
            </div>`;
        }).join('');
    }

    async function refreshStockStatus() {
        try {
            const translations = getAllTranslations().map(t => ({ id: t.id, files: t.files, version: t.version, cat: t.cat }));
            const status = await swPostRequest('GET_BIBLE_STOCK', { translations }, 'BIBLE_STOCK_STATUS');
            renderArsenalStock(status.result || {});
        } catch {
            renderArsenalStock({});
        }
    }

    function buildList() {
        const container = document.getElementById('bible-offline-list');
        const syncBtn = document.getElementById('bible-sync-btn');
        if (!container) return;
        if (syncBtn && !syncBtn.dataset.bound) {
            syncBtn.addEventListener('click', syncOffline);
            syncBtn.dataset.bound = '1';
        }

        const cats = [
            { key:'hebraico', label:'📜 Hebraico' },
            { key:'grego', label:'📜 Grego' },
            { key:'aramaico', label:'📜 Aramaico' },
            { key:'latim', label:'⛪ Latim' },
            { key:'translit', label:'🔤 Transliterações' },
            { key:'portugues', label:'🇧🇷 Português' },
            { key:'ingles', label:'🇺🇸 Inglês' },
            { key:'judaica', label:'✡ Messiânica/Judaica' },
            { key:'outras', label:'🌍 Outras' },
        ];

        let html = '';
        const all = getAllTranslations();
        for (const cat of cats) {
            const items = all.filter(t => t.cat === cat.key);
            if (!items.length) continue;
            html += `<div class="bible-offline-cat-label" style="grid-column:1/-1;font-size:0.75rem;color:var(--gold-primary);font-family:var(--font-heading);margin-top:8px;">${cat.label}</div>`;
            for (const t of items) {
                const checked = selected.has(t.id) ? 'checked' : '';
                html += `<label class="bible-offline-item ${selected.has(t.id)?'selected':''}" id="offline-${t.id}">
                    <input type="checkbox" ${checked} onchange="BibleOffline.toggle('${t.id}', this.checked)">
                    <span>${t.name} <small class="offline-version">v${t.version}</small></span>
                    <span class="offline-size">${t.size}</span>
                </label>`;
            }
        }
        container.innerHTML = html;
    }

    function toggle(id, checked) {
        if (checked) selected.add(id); else selected.delete(id);
        const el = document.getElementById('offline-' + id);
        if (el) el.classList.toggle('selected', checked);
    }

    function selectPreset(preset) {
        selected.clear();
        if (preset === 'essencial') {
            ESSENCIAL.forEach(id => selected.add(id));
        } else if (preset === 'completo') {
            getAllTranslations().forEach(t => selected.add(t.id));
        }
        buildList();
    }

    function startDownload() {
        if (!selected.size) { alert('Selecione ao menos uma tradução!'); return; }
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
            alert('Service Worker não disponível. Recarregue a página.'); return;
        }

        const translations = getAllTranslations().filter(t => selected.has(t.id)).map(t => ({
            id: t.id,
            files: t.files,
            version: t.version,
            lang: t.cat
        }));
        const btn = document.getElementById('bible-download-btn');
        const progress = document.getElementById('bible-offline-progress');
        const bar = document.getElementById('bible-progress-bar');
        const text = document.getElementById('bible-progress-text');

        btn.disabled = true;
        btn.textContent = '⏳ Baixando...';
        progress.style.display = 'block';
        bar.style.width = '0%';

        navigator.serviceWorker.addEventListener('message', function handler(e) {
            if (e.data.type === 'DOWNLOAD_PROGRESS') {
                const pct = Math.round((e.data.downloaded / e.data.totalFiles) * 100);
                bar.style.width = pct + '%';
                text.textContent = `${e.data.downloaded}/${e.data.totalFiles} arquivos — ${e.data.currentTranslation} v${e.data.version || ''} (${pct}%)`;
            }
            if (e.data.type === 'DOWNLOAD_COMPLETE') {
                bar.style.width = '100%';
                text.textContent = `✅ Concluído! ${e.data.downloaded} arquivos baixados` +
                    (e.data.errors ? ` (${e.data.errors} erros)` : '');
                btn.disabled = false;
                btn.textContent = '📥 Baixar Selecionadas';
                navigator.serviceWorker.removeEventListener('message', handler);
                refreshStockStatus();
            }
        });

        navigator.serviceWorker.controller.postMessage({
            type: 'DOWNLOAD_BIBLES',
            translations
        });
    }

    async function syncOffline() {
        const btn = document.getElementById('bible-sync-btn');
        const text = document.getElementById('bible-progress-text');
        const progress = document.getElementById('bible-offline-progress');
        const bar = document.getElementById('bible-progress-bar');
        if (!btn) return;

        btn.disabled = true;
        btn.textContent = '🔄 Sincronizando...';
        progress.style.display = 'block';
        bar.style.width = '5%';
        text.textContent = 'Verificando versões em estoque...';

        const translations = getAllTranslations().map(t => ({
            id: t.id,
            files: t.files,
            version: t.version,
            lang: t.cat
        }));

        navigator.serviceWorker.addEventListener('message', function handler(e) {
            if (e.data.type === 'DOWNLOAD_PROGRESS') {
                const pct = Math.round((e.data.downloaded / e.data.totalFiles) * 100);
                bar.style.width = pct + '%';
                text.textContent = `Sincronizando ${e.data.currentTranslation}... ${pct}%`;
            }
            if (e.data.type === 'DOWNLOAD_COMPLETE') {
                bar.style.width = '100%';
                text.textContent = `✅ Sincronização concluída. ${e.data.downloaded} arquivos verificados.`;
                btn.disabled = false;
                btn.textContent = '🔄 Sincronizar Offline';
                navigator.serviceWorker.removeEventListener('message', handler);
                refreshStockStatus();
            }
        });

        navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_BIBLES',
            translations
        });
    }

    async function clearCache() {
        if (!confirm('Remover todas as Bíblias offline?')) return;
        await caches.delete('bussola-bible-v1');
        alert('Cache de Bíblias removido!');
        buildList();
        refreshStockStatus();
    }

    return { buildList, toggle, selectPreset, startDownload, clearCache, syncOffline, refreshStockStatus };
})();
