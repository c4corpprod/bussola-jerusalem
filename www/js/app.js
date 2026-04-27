/* ═══════════════════════════════════════════════════════════════
   🕎 APP.JS — Módulo Principal — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Orquestra todos os módulos: GPS, Bússola, Mapa e PIX
   ═══════════════════════════════════════════════════════════════ */

const App = (() => {
    const DOM = {};
    let isInitialized = false;

    /**
     * Inicializa o aplicativo
     */
    function init() {
        console.log('🕎 Bússola para Jerusalém — Iniciando...');
        console.log('© 2026 Marcos Fernando — C4 Corporation');

        cacheDOM();
        setupSplashScreen();
    }

    /**
     * Armazena referências aos elementos DOM
     */
    function cacheDOM() {
        DOM.splashScreen = document.getElementById('splash-screen');
        DOM.app = document.getElementById('app');
        DOM.permissionModal = document.getElementById('permission-modal');
        DOM.bearingValue = document.getElementById('bearing-value');
        DOM.distanceValue = document.getElementById('distance-value');
        DOM.headingValue = document.getElementById('heading-value');
    }

    /**
     * Controla a tela de splash
     */
    function setupSplashScreen() {
        setTimeout(() => {
            if (DOM.splashScreen) {
                DOM.splashScreen.classList.add('fade-out');
                setTimeout(() => {
                    DOM.splashScreen.style.display = 'none';
                    showApp();
                }, 800);
            }
        }, 3000); // 3 segundos de splash
    }

    /**
     * Mostra o app principal e solicita permissões
     */
    function showApp() {
        if (DOM.app) {
            DOM.app.classList.remove('hidden');
        }

        // Verifica se precisa solicitar permissões
        checkPermissions();
    }

    /**
     * Verifica e solicita permissões necessárias
     */
    function checkPermissions() {
        // Em iOS 13+, DeviceOrientation precisa de permissão explícita via gesto do usuário
        const needsOrientationPermission = 
            typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function';

        if (needsOrientationPermission) {
            // Mostra modal para iOS
            showPermissionModal();
        } else {
            // Android e outros — inicia direto
            startAllSystems();
        }
    }

    /**
     * Mostra o modal de permissão (necessário em iOS)
     */
    function showPermissionModal() {
        if (DOM.permissionModal) {
            DOM.permissionModal.classList.remove('hidden');
        }
    }

    /**
     * Inicia todos os sistemas do app
     */
    async function startAllSystems() {
        // Esconde modal se estiver visível
        if (DOM.permissionModal) {
            DOM.permissionModal.classList.add('hidden');
        }

        console.log('🧭 Iniciando sistemas...');

        // 1. Inicializa a bússola
        CompassModule.init((heading) => {
            updateHeadingDisplay(heading);
        });

        // 2. Inicia sensor de orientação
        try {
            const orientationOk = await CompassModule.startOrientation();
            console.log('🧭 Orientação:', orientationOk ? 'Ativo' : 'Não disponível (usando GPS heading)');
        } catch (e) {
            console.warn('⚠️ Orientação não disponível:', e);
        }

        // 3. Inicia GPS
        const gpsStarted = GeoModule.startTracking((data, error) => {
            if (error) {
                console.error('❌ GPS:', error);
                updateDisplayError(error);
                return;
            }

            if (data) {
                // Atualiza bússola com o bearing para Jerusalém
                CompassModule.updateBearing(data.jerusalem.bearing);

                // Atualiza GPS heading como fallback
                if (data.position.heading !== null) {
                    CompassModule.setHeading(data.position.heading);
                }

                // Atualiza displays
                updateNavigationDisplay(data);

                // Atualiza mapa (se habilitado)
                if (AppSettings.get('showMap')) {
                    MapsModule.updateUserPosition(
                        data.position.lat,
                        data.position.lng
                    );
                }
            }
        });

        console.log('📍 GPS:', gpsStarted ? 'Iniciado' : 'Falhou');

        // 4. Inicializa Google Maps (só se habilitado)
        if (AppSettings.get('showMap')) {
            MapsModule.init();
        }

        // 5. Inicializa módulo PIX
        PixModule.init();

        // 6. Inicializa Player de Música Hebraica (Kadoshin)
        if (typeof MusicModule !== 'undefined') {
            MusicModule.init();
            console.log('🎵 Player de música hebraica iniciado');
        }

        // 7. Carrega salmo do dia
        loadDailyPsalm();

        // 8. Aplica configurações salvas
        AppSettings.apply();

        // 9. Inicializa módulo da comunidade
        if (typeof CommunityModule !== 'undefined') {
            CommunityModule.init();
            console.log('👥 Módulo da comunidade iniciado');
        }

        // 10. Inicializa módulo de estudos
        if (typeof StudiesModule !== 'undefined') {
            StudiesModule.init();
            console.log('🧾 Módulo de estudos iniciado');
        }

        isInitialized = true;
        console.log('✅ Todos os sistemas iniciados!');
    }

    /**
     * Salmos embutidos para funcionar offline (sem backend)
     */
    const SALMOS_OFFLINE = [
        { he: 'הַשָּׁמַיִם מְסַפְּרִים כְּבוֹד־אֵל', pt: 'Os céus declaram a glória de Deus e o firmamento anuncia a obra das suas mãos.', ref: 'Salmo 19:1' },
        { he: 'ה׳ רֹעִי לֹא אֶחְסָר', pt: 'O Senhor é o meu pastor; nada me faltará.', ref: 'Salmo 23:1' },
        { he: 'שִׁיר הַמַּעֲלוֹת אֶשָּׂא עֵינַי אֶל־הֶהָרִים', pt: 'Elevo os meus olhos para os montes; de onde me virá o socorro?', ref: 'Salmo 121:1' },
        { he: 'שַׁאֲלוּ שְׁלוֹם יְרוּשָׁלָיִם', pt: 'Orai pela paz de Jerusalém; prosperarão aqueles que te amam.', ref: 'Salmo 122:6' },
        { he: 'אִם־אֶשְׁכָּחֵךְ יְרוּשָׁלָיִם תִּשְׁכַּח יְמִינִי', pt: 'Se eu me esquecer de ti, ó Jerusalém, que a minha mão direita se esqueça da sua destreza.', ref: 'Salmo 137:5' },
        { he: 'הִנֵּה מַה־טּוֹב וּמַה־נָּעִים שֶׁבֶת אַחִים גַּם־יָחַד', pt: 'Oh! Quão bom e quão suave é que os irmãos vivam em união!', ref: 'Salmo 133:1' },
        { he: 'הוֹדוּ לַה׳ כִּי־טוֹב כִּי לְעוֹלָם חַסְדּוֹ', pt: 'Louvai ao Senhor, porque ele é bom; porque a sua misericórdia dura para sempre.', ref: 'Salmo 136:1' },
        { he: 'בְּכָל־לְבָבִי דְרַשְׁתִּיךָ', pt: 'De todo o meu coração te busquei; não me deixes desviar dos teus mandamentos.', ref: 'Salmo 119:10' },
        { he: 'כִּי עִמְּךָ מְקוֹר חַיִּים בְּאוֹרְךָ נִרְאֶה־אוֹר', pt: 'Pois em ti está a fonte da vida; na tua luz, veremos a luz.', ref: 'Salmo 36:9' },
        { he: 'טַעֲמוּ וּרְאוּ כִּי־טוֹב ה׳', pt: 'Provai e vede que o Senhor é bom; bem-aventurado o homem que nele confia.', ref: 'Salmo 34:8' },
        { he: 'הַלְלוּ אֶת־ה׳ מִן־הַשָּׁמַיִם', pt: 'Louvai ao Senhor desde os céus, louvai-o nas alturas.', ref: 'Salmo 148:1' },
        { he: 'שִׁירוּ לַה׳ שִׁיר חָדָשׁ', pt: 'Cantai ao Senhor um cântico novo, porque fez maravilhas.', ref: 'Salmo 98:1' },
        { he: 'ה׳ אוֹרִי וְיִשְׁעִי מִמִּי אִירָא', pt: 'O Senhor é a minha luz e a minha salvação; a quem temerei?', ref: 'Salmo 27:1' },
        { he: 'כִּי אַתָּה נֵרִי ה׳', pt: 'Porque tu és a minha lâmpada, ó Senhor; o Senhor iluminará as minhas trevas.', ref: '2 Samuel 22:29' },
        { he: 'גַּם כִּי אֵלֵךְ בְּגֵיא צַלְמָוֶת לֹא אִירָא רָע', pt: 'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo.', ref: 'Salmo 23:4' },
        { he: 'ה׳ צְבָאוֹת עִמָּנוּ מִשְׂגָּב לָנוּ', pt: 'O Senhor dos Exércitos está conosco; o Deus de Jacó é o nosso refúgio.', ref: 'Salmo 46:7' },
        { he: 'מִמַּעֲמַקִּים קְרָאתִיךָ ה׳', pt: 'Das profundezas a ti clamo, ó Senhor.', ref: 'Salmo 130:1' },
        { he: 'לֵב טָהוֹר בְּרָא לִי אֱלֹהִים', pt: 'Cria em mim, ó Deus, um coração puro, e renova dentro de mim um espírito inabalável.', ref: 'Salmo 51:10' },
        { he: 'ה׳ שְׁמָרֵנִי כְּאִישׁוֹן בַּת־עָיִן', pt: 'Guarda-me como a menina dos teus olhos; esconde-me debaixo da sombra das tuas asas.', ref: 'Salmo 17:8' },
        { he: 'אֲבָרֲכָה אֶת־ה׳ בְּכָל־עֵת', pt: 'Louvarei ao Senhor em todo o tempo; o seu louvor estará continuamente na minha boca.', ref: 'Salmo 34:1' },
        { he: 'כֹּחִי וְזִמְרָת יָהּ', pt: 'O Senhor é a minha força e o meu cântico; ele me foi por salvação.', ref: 'Salmo 118:14' },
        { he: 'ה׳ קָרוֹב לְכָל קֹרְאָיו', pt: 'Perto está o Senhor de todos os que o invocam, de todos os que o invocam em verdade.', ref: 'Salmo 145:18' },
        { he: 'נֵר לְרַגְלִי דְבָרֶךָ', pt: 'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.', ref: 'Salmo 119:105' },
        { he: 'בִּטְחוּ בַה׳ עֲדֵי־עַד', pt: 'Confiai no Senhor perpetuamente, pois o Senhor Deus é uma rocha eterna.', ref: 'Isaías 26:4' },
        { he: 'רְפָאֵנִי ה׳ וְאֵרָפֵא', pt: 'Cura-me, ó Senhor, e serei curado; salva-me, e serei salvo; porque tu és o meu louvor.', ref: 'Jeremias 17:14' },
        { he: 'מִזְמוֹר לְדָוִד ה׳ מָה רַבּוּ צָרָי', pt: 'Senhor, como se têm multiplicado os meus adversários! Muitos se levantam contra mim.', ref: 'Salmo 3:1' },
        { he: 'הוֹדוּ לַה׳ קִרְאוּ בִשְׁמוֹ', pt: 'Louvai ao Senhor, invocai o seu nome; fazei conhecidas as suas obras entre os povos.', ref: 'Salmo 105:1' },
        { he: 'יְבָרֶכְךָ ה׳ מִצִּיּוֹן', pt: 'O Senhor te abençoe desde Sião, e vejas tu o bem de Jerusalém por todos os dias.', ref: 'Salmo 128:5' },
        { he: 'שָׁלוֹם רָב לְאֹהֲבֵי תוֹרָתֶךָ', pt: 'Muita paz têm os que amam a tua lei, e para eles não há tropeço.', ref: 'Salmo 119:165' },
        { he: 'מָה אָהַבְתִּי תוֹרָתֶךָ כָּל הַיּוֹם הִיא שִׂיחָתִי', pt: 'Oh! Quanto amo a tua lei! É a minha meditação em todo o dia.', ref: 'Salmo 119:97' },
        { he: 'יְהִי שֵׁם ה׳ מְבֹרָךְ', pt: 'Seja o nome do Senhor bendito desde agora e para sempre.', ref: 'Salmo 113:2' },
        { he: 'אֵלִי אַתָּה וְאוֹדֶךָּ', pt: 'Tu és o meu Deus, e eu te louvarei; tu és o meu Deus, e eu te exaltarei.', ref: 'Salmo 118:28' },
    ];

    /**
     * Carrega o Salmo do dia (offline, baseado no dia do ano)
     */
    function loadDailyPsalm() {
        const container = document.getElementById('daily-psalm');
        if (!container) return;

        // Seleciona salmo baseado no dia do ano
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const salmo = SALMOS_OFFLINE[dayOfYear % SALMOS_OFFLINE.length];

        container.innerHTML = `
            <div class="psalm-card">
                <div class="psalm-hebrew">${salmo.he}</div>
                <div class="psalm-pt">"${salmo.pt}"</div>
                <div class="psalm-ref">— ${salmo.ref}</div>
            </div>
        `;
    }

    /**
     * Atualiza o display de navegação
     */
    function updateNavigationDisplay(data) {
        if (DOM.bearingValue) {
            DOM.bearingValue.textContent = `${Math.round(data.jerusalem.bearing)}° ${data.jerusalem.bearingCardinal}`;
        }

        if (DOM.distanceValue) {
            DOM.distanceValue.textContent = data.jerusalem.distanceFormatted;
        }
    }

    /**
     * Atualiza o display do heading
     */
    function updateHeadingDisplay(heading) {
        if (DOM.headingValue) {
            DOM.headingValue.textContent = `${Math.round(heading)}°`;
        }
    }

    /**
     * Mostra erro no display
     */
    function updateDisplayError(error) {
        if (DOM.distanceValue) {
            DOM.distanceValue.textContent = '⚠️';
            DOM.distanceValue.title = error;
        }
    }

    // Inicia quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Listener: clique em notificação do SW pode pedir para trocar de aba
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'OPEN_TAB' && e.data.tab) {
                if (typeof switchTab === 'function') {
                    switchTab(e.data.tab);
                }
            }
        });
    }

    // API Pública
    return {
        startAllSystems,
        isInitialized: () => isInitialized
    };
})();

/**
 * Função global chamada pelo botão de permissão
 */
function requestAllPermissions() {
    App.startAllSystems();
}

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ABAS
   ═══════════════════════════════════════════════════════════════ */
function switchTab(tabId) {
    // Desativa todas as abas
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Ativa a aba selecionada
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add('active');

    const btn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    // Inicializa mapa quando abrir a aba pela primeira vez
    if (tabId === 'tab-map' && AppSettings.get('showMap') && !MapsModule.isReady()) {
        MapsModule.init();
    }

    // Atualiza mapa ao abrir aba
    if (tabId === 'tab-map' && MapsModule.isReady()) {
        MapsModule.fitBothPoints();
    }

    // Carrega posts ao abrir comunidade
    if (tabId === 'tab-community' && typeof CommunityModule !== 'undefined') {
        CommunityModule.loadPosts();
    }

    // Reaplica filtros ao abrir estudos + carrega estudos da comunidade
    if (tabId === 'tab-studies' && typeof StudiesModule !== 'undefined') {
        StudiesModule.applyFilters();
        StudiesModule.loadCommunityStudies(1);
    }
}

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE CONFIGURAÇÕES (persistidas em localStorage)
   ═══════════════════════════════════════════════════════════════ */
const AppSettings = (() => {
    const STORAGE_KEY = 'bussola_settings';
    const DEFAULTS = {
        showMap: true,
        wakeLock: false,
        autoMusic: false,
        lightTheme: false
    };

    let settings = { ...DEFAULTS };

    // Carrega do localStorage
    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                settings = { ...DEFAULTS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('⚠️ Erro ao carregar configurações:', e);
        }
    }

    // Salva no localStorage
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('⚠️ Erro ao salvar configurações:', e);
        }
    }

    // Obtém valor de uma configuração
    function get(key) {
        return settings[key] ?? DEFAULTS[key];
    }

    // Alterna uma configuração
    function toggle(key, value) {
        settings[key] = value;
        save();
        applyOne(key, value);
    }

    // Aplica uma configuração específica
    function applyOne(key, value) {
        switch (key) {
            case 'showMap':
                MapsModule.setEnabled(value);
                break;
            case 'wakeLock':
                manageWakeLock(value);
                break;
            case 'lightTheme':
                document.documentElement.setAttribute('data-theme', value ? 'light' : 'dark');
                document.querySelector('meta[name="theme-color"]').content = value ? '#f5f0e0' : '#1a0a00';
                if (typeof MapsModule !== 'undefined' && MapsModule.isReady()) {
                    MapsModule.refreshTheme();
                }
                break;
            case 'autoMusic':
                break;
        }
    }

    // Aplica todas as configurações aos toggles
    function apply() {
        load();
        // Aplica toggles nos checkboxes
        const mapping = { showMap: 'map', wakeLock: 'wakelock', autoMusic: 'music', lightTheme: 'theme' };
        Object.entries(settings).forEach(([key, value]) => {
            const el = document.getElementById(`setting-${mapping[key] || key}`);
            if (el) el.checked = value;
            applyOne(key, value);
        });
    }

    // Wake Lock API
    let wakeLockSentinel = null;
    async function manageWakeLock(enable) {
        if (!('wakeLock' in navigator)) return;
        try {
            if (enable && !wakeLockSentinel) {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
                console.log('🔆 Wake Lock ativado');
            } else if (!enable && wakeLockSentinel) {
                await wakeLockSentinel.release();
                wakeLockSentinel = null;
                console.log('🔅 Wake Lock desativado');
            }
        } catch (e) {
            console.warn('⚠️ Wake Lock:', e);
        }
    }

    // Carrega config na inicialização
    load();

    return { get, toggle, apply, load };
})();

/* Helpers globais para os botões PIX */
function selectDonation(value) {
    if (typeof PixModule !== 'undefined') PixModule.selectValue(value);
}
function copyPixKey() {
    if (typeof PixModule !== 'undefined') PixModule.copyKey();
}
