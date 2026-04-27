/* ═══════════════════════════════════════════════════════════════
   DAILY VERSE — Versículo do dia + notificações locais
   ───────────────────────────────────────────────────────────────
   • Notificação local diária (Notification API + Service Worker)
   • Não requer servidor push; usa agendamento client-side
   • O usuário ativa em ⚙️ Opções → "Versículo do dia"
   ═══════════════════════════════════════════════════════════════ */
const DailyVerse = (() => {
    const STORAGE_KEY = 'bj_daily_verse';
    const VERSES = [
        { ref: 'Salmos 23:1',     text: 'O Senhor é o meu pastor; nada me faltará.' },
        { ref: 'Provérbios 3:5',  text: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.' },
        { ref: 'Filipenses 4:13', text: 'Tudo posso naquele que me fortalece.' },
        { ref: 'João 3:16',       text: 'Porque Deus amou ao mundo de tal maneira que deu o seu Filho unigênito.' },
        { ref: 'Isaías 41:10',    text: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.' },
        { ref: 'Jeremias 29:11',  text: 'Porque eu bem sei os pensamentos que tenho a vosso respeito, pensamentos de paz e não de mal.' },
        { ref: 'Romanos 8:28',    text: 'Todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.' },
        { ref: 'Mateus 11:28',    text: 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.' },
        { ref: 'Salmos 91:1',     text: 'Aquele que habita no esconderijo do Altíssimo descansará à sombra do Onipotente.' },
        { ref: 'Salmos 27:1',     text: 'O Senhor é a minha luz e a minha salvação; a quem temerei?' },
        { ref: '1 Coríntios 13:4', text: 'O amor é paciente, é benigno; o amor não arde em ciúmes, não se ufana, não se ensoberbece.' },
        { ref: 'Provérbios 16:3', text: 'Confia ao Senhor as tuas obras, e teus pensamentos serão estabelecidos.' },
        { ref: 'Tiago 1:5',       text: 'Se algum de vós tem falta de sabedoria, peça-a a Deus, que dá a todos liberalmente.' },
        { ref: 'Salmos 119:105',  text: 'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.' },
        { ref: 'Mateus 6:33',     text: 'Buscai, pois, em primeiro lugar, o seu reino e a sua justiça, e todas estas coisas vos serão acrescentadas.' },
        { ref: 'Hebreus 11:1',    text: 'Ora, a fé é a certeza de coisas que se esperam, a convicção de fatos que se não veem.' },
        { ref: 'Salmos 46:1',     text: 'Deus é o nosso refúgio e fortaleza, socorro bem presente nas tribulações.' },
        { ref: 'Isaías 40:31',    text: 'Mas os que esperam no Senhor renovam as suas forças, sobem com asas como águias.' },
        { ref: 'Romanos 12:2',    text: 'E não vos conformeis com este mundo, mas transformai-vos pela renovação da vossa mente.' },
        { ref: 'Gálatas 5:22',    text: 'Mas o fruto do Espírito é: amor, alegria, paz, longanimidade, benignidade, bondade, fidelidade.' },
        { ref: 'Efésios 2:8',     text: 'Porque pela graça sois salvos, mediante a fé; e isto não vem de vós, é dom de Deus.' },
        { ref: 'Salmos 37:4',     text: 'Deleita-te também no Senhor, e ele te concederá o que deseja o teu coração.' },
        { ref: 'Mateus 5:16',     text: 'Assim brilhe também a vossa luz diante dos homens, para que vejam as vossas boas obras.' },
        { ref: '1 João 4:8',      text: 'Aquele que não ama não conhece a Deus, porque Deus é amor.' },
        { ref: 'Deuteronômio 31:6', text: 'Sede fortes e corajosos; não temais, porque o Senhor, vosso Deus, é quem vai convosco.' },
        { ref: 'Salmos 34:8',     text: 'Provai e vede que o Senhor é bom; bem-aventurado o homem que nele se refugia.' },
        { ref: '2 Timóteo 1:7',   text: 'Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de moderação.' },
        { ref: 'Provérbios 18:10', text: 'Torre forte é o nome do Senhor; para ela corre o justo e está seguro.' },
        { ref: 'Mateus 28:20',    text: 'E eis que estou convosco todos os dias até a consumação dos séculos.' },
        { ref: 'Gênesis 1:1',     text: 'No princípio criou Deus os céus e a terra.' },
        { ref: 'Salmos 1:1',      text: 'Bem-aventurado o homem que não anda no conselho dos ímpios, nem se detém no caminho dos pecadores.' },
    ];

    function getDayOfYear() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        return Math.floor(diff / 86400000);
    }

    function todayVerse() {
        return VERSES[getDayOfYear() % VERSES.length];
    }

    function isEnabled() {
        return localStorage.getItem(STORAGE_KEY + '_enabled') === '1';
    }

    function setEnabled(v) {
        localStorage.setItem(STORAGE_KEY + '_enabled', v ? '1' : '0');
    }

    async function requestPermission() {
        if (!('Notification' in window)) {
            alert('⚠️ Notificações não são suportadas neste navegador.');
            return false;
        }
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') {
            alert('🔕 Notificações foram bloqueadas. Habilite nas configurações do navegador.');
            return false;
        }
        const result = await Notification.requestPermission();
        return result === 'granted';
    }

    async function enable() {
        const ok = await requestPermission();
        if (!ok) {
            const cb = document.getElementById('setting-daily-verse');
            if (cb) cb.checked = false;
            return false;
        }
        setEnabled(true);
        // Mostra a primeira notificação imediatamente para confirmar
        await showVerseNotification(true);
        return true;
    }

    function disable() {
        setEnabled(false);
    }

    async function showVerseNotification(force = false) {
        if (!isEnabled() && !force) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const lastShown = localStorage.getItem(STORAGE_KEY + '_last');
        const today = new Date().toDateString();
        if (!force && lastShown === today) return;

        const v = todayVerse();
        const title = '🕎 Versículo do Dia';
        const options = {
            body: `"${v.text}"\n— ${v.ref}`,
            icon: 'assets/img/icon-192.png',
            badge: 'assets/img/icon-72.png',
            tag: 'daily-verse',
            data: { url: '/', tab: 'tab-bible', verse: v },
            requireInteraction: false,
        };

        try {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, options);
            } else {
                new Notification(title, options);
            }
            localStorage.setItem(STORAGE_KEY + '_last', today);
        } catch (e) {
            console.warn('Falha ao mostrar notificação:', e);
        }
    }

    // Verifica horário preferido (padrão 7h)
    function preferredHour() {
        const h = parseInt(localStorage.getItem(STORAGE_KEY + '_hour'), 10);
        return Number.isFinite(h) && h >= 0 && h < 24 ? h : 7;
    }

    function setPreferredHour(h) {
        localStorage.setItem(STORAGE_KEY + '_hour', String(h));
    }

    // Chamado ao abrir o app: mostra versículo se for novo dia e passou da hora
    async function checkAndNotify() {
        if (!isEnabled()) return;
        const now = new Date();
        if (now.getHours() < preferredHour()) return;
        await showVerseNotification(false);
    }

    function init() {
        // Sincroniza UI
        const cb = document.getElementById('setting-daily-verse');
        if (cb) cb.checked = isEnabled();
        const hourSel = document.getElementById('setting-daily-verse-hour');
        if (hourSel) hourSel.value = String(preferredHour());

        // Verifica ao abrir o app + a cada 1h enquanto o app estiver aberto
        setTimeout(() => checkAndNotify(), 4000);
        setInterval(() => checkAndNotify(), 60 * 60 * 1000);

        // Verifica também quando a aba volta a ficar visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) checkAndNotify();
        });
    }

    return {
        init,
        enable,
        disable,
        toggle: async (v) => v ? enable() : disable(),
        setPreferredHour,
        showVerseNow: () => showVerseNotification(true),
        todayVerse,
    };
})();

// Inicializa após DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DailyVerse.init());
} else {
    DailyVerse.init();
}
