/* ═══════════════════════════════════════════════════════════════
   🎵 MUSIC MODULE — Bússola para Jerusalém
   © 2026 Marcos Fernando — C4 Corporation
   
   Player de melodia hebraica instrumental
   Autoplay no volume 45% com botão de pause
   ═══════════════════════════════════════════════════════════════ */

const MusicModule = (() => {
    let audio = null;
    let isPlaying = false;
    let volume = 0.45; // 45% de volume

    const TRACK = {
        title: "Melodias Judaica Instrumental",
        artist: "Músicas Sagradas de Israel",
        src: "assets/melodia-hebraica.mp3"
    };

    /**
     * Inicializa o player de música
     */
    function init() {
        createPlayerUI();
        
        // Cria o elemento de áudio
        audio = new Audio(TRACK.src);
        audio.volume = volume;
        audio.loop = true; // Repete infinitamente
        audio.preload = 'auto';

        // Quando carregar, tenta autoplay
        audio.addEventListener('canplaythrough', () => {
            autoPlay();
        }, { once: true });

        // Fallback: tenta autoplay depois de um tempo
        setTimeout(() => {
            if (!isPlaying) autoPlay();
        }, 2000);

        console.log('🎵 Player de música inicializado (volume 45%)');
    }

    /**
     * Tenta iniciar a música automaticamente
     * Navegadores podem bloquear autoplay sem interação do usuário
     */
    function autoPlay() {
        if (isPlaying) return;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                updatePlayButton();
                console.log('🎵 Autoplay: tocando');
            }).catch(() => {
                // Autoplay bloqueado — aguarda primeiro toque do usuário
                console.log('🎵 Autoplay bloqueado — aguardando interação');
                waitForUserInteraction();
            });
        }
    }

    /**
     * Aguarda qualquer interação do usuário para iniciar a música
     */
    function waitForUserInteraction() {
        const startOnInteraction = () => {
            if (!isPlaying && audio) {
                audio.play().then(() => {
                    isPlaying = true;
                    updatePlayButton();
                }).catch(() => {});
            }
            // Remove listeners após primeiro uso
            document.removeEventListener('touchstart', startOnInteraction);
            document.removeEventListener('click', startOnInteraction);
        };

        document.addEventListener('touchstart', startOnInteraction, { once: true });
        document.addEventListener('click', startOnInteraction, { once: true });
    }

    /**
     * Cria a UI do player flutuante (botão de pause/play)
     */
    function createPlayerUI() {
        const player = document.createElement('div');
        player.id = 'music-player';
        player.className = 'music-player';
        player.innerHTML = `
            <button id="music-toggle" class="music-toggle" onclick="MusicModule.togglePlay()" title="Melodia Hebraica">
                <span id="music-icon" class="music-icon">🎵</span>
            </button>
            <div id="music-panel" class="music-panel hidden">
                <div class="music-panel-header">
                    <span>🕎 Melodia Sagrada</span>
                    <button class="music-close" onclick="MusicModule.closePanel()">✕</button>
                </div>
                <div id="music-now-playing" class="music-now-playing">
                    <span class="music-title">${TRACK.title}</span>
                    <span class="music-artist">${TRACK.artist}</span>
                </div>
                <div class="music-controls">
                    <button id="music-play-btn" class="music-btn music-play" onclick="MusicModule.togglePlay()">⏸</button>
                </div>
                <div class="music-volume">
                    <span>🔈</span>
                    <input type="range" id="music-volume" min="0" max="100" value="45" 
                           oninput="MusicModule.setVolume(this.value)">
                    <span>🔊</span>
                </div>
            </div>
        `;
        document.body.appendChild(player);
    }

    /**
     * Atualiza o ícone do botão de play/pause
     */
    function updatePlayButton() {
        const btn = document.getElementById('music-play-btn');
        const icon = document.getElementById('music-icon');
        if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
        if (icon) icon.textContent = isPlaying ? '🎵' : '🔇';
    }

    /**
     * Toggle do painel de controle
     */
    function toggle() {
        const panel = document.getElementById('music-panel');
        if (panel) panel.classList.toggle('hidden');
    }

    function closePanel() {
        const panel = document.getElementById('music-panel');
        if (panel) panel.classList.add('hidden');
    }

    /**
     * Play/Pause
     */
    function togglePlay() {
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            isPlaying = false;
        } else {
            audio.play().then(() => {
                isPlaying = true;
            }).catch(e => {
                console.warn('Erro ao tocar:', e);
            });
        }
        updatePlayButton();
    }

    /**
     * Ajusta o volume
     */
    function setVolume(val) {
        volume = val / 100;
        if (audio) audio.volume = volume;
    }

    // API Pública
    return {
        init,
        toggle,
        closePanel,
        togglePlay,
        setVolume
    };
})();
