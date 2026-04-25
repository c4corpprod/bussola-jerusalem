/* ═══════════════════════════════════════════════════════════════
   👥 COMMUNITY MODULE — Bússola para Jerusalém (API + SQLite)
   © 2026 Marcos Fernando — C4 Corporation

   Comunidade com backend próprio:
   - Feed de posts
   - Amizade
   - Chat privado entre amigos
   - Compartilhamento interno de versículos
   ═══════════════════════════════════════════════════════════════ */

const CommunityModule = (() => {
    const STORAGE_TOKEN_KEY = 'bj_session_token';

    let sessionToken = localStorage.getItem(STORAGE_TOKEN_KEY) || '';
    let currentUser = null;
    let currentFilter = '';
    let currentSection = 'feed';
    let selectedAvatar = null;
    let selectedChatFriendId = null;

    async function api(path, options = {}) {
        const method = options.method || 'GET';
        const auth = options.auth !== false;
        const headers = { 'Content-Type': 'application/json' };
        if (auth && sessionToken) {
            headers.Authorization = `Bearer ${sessionToken}`;
        }

        const base = window.BACKEND_URL || '';
        const response = await fetch(base + path, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Erro de comunicação com a API');
        }
        return data;
    }

    function isAuthenticated() {
        return !!currentUser && !!sessionToken;
    }

    function updateAuthUI() {
        const authArea = document.getElementById('community-auth-area');
        const createPost = document.getElementById('create-post-area');
        if (!authArea) return;

        if (isAuthenticated()) {
            authArea.innerHTML = `
                <div class="user-bar">
                    <span class="user-avatar">${currentUser.avatar_emoji || '🕎'}</span>
                    <span class="user-name">${escapeHtml(currentUser.name)}</span>
                    <button class="btn-small" onclick="CommunityModule.showProfile()">⚙️ Perfil</button>
                    <button class="btn-small btn-logout" onclick="CommunityModule.logout()">Sair</button>
                </div>
            `;
            if (createPost) createPost.classList.remove('hidden');
        } else {
            authArea.innerHTML = `
                <div class="auth-invite">
                    <p>Entre para participar da comunidade.</p>
                    <div class="auth-btns-row">
                        <button class="sacred-btn" onclick="CommunityModule.showLoginModal()">✡ Entrar com Apelido</button>
                        <button class="sacred-btn btn-google" onclick="CommunityModule.showGoogleLogin()">
                            <svg width="18" height="18" viewBox="0 0 18 18" style="vertical-align:middle;margin-right:6px"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                            Google
                        </button>
                    </div>
                    <p class="auth-hint" style="font-size:0.78rem;color:var(--text-muted);margin-top:8px">Já tem conta? <a href="#" onclick="CommunityModule.showPasswordLoginModal();return false">Entrar com senha</a></p>
                </div>
            `;
            if (createPost) createPost.classList.add('hidden');
        }
    }

    async function hydrateSession() {
        if (!sessionToken) {
            currentUser = null;
            updateAuthUI();
            return;
        }

        try {
            const me = await api('/api/auth/me');
            currentUser = me;
        } catch (e) {
            sessionToken = '';
            currentUser = null;
            localStorage.removeItem(STORAGE_TOKEN_KEY);
        }

        updateAuthUI();
    }

    function showLoginModal() {
        let modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            return;
        }

        modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content login-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('login-modal').classList.add('hidden')">✕</button>
                <div class="modal-icon">🕎</div>
                <h2>Entrar na Comunidade</h2>
                <p style="color: var(--text-muted); margin-bottom: 12px;">Login rápido por apelido</p>
                <input type="text" id="login-name" class="sacred-input" placeholder="Seu nome" maxlength="30">
                <button id="login-send-btn" class="sacred-btn" onclick="CommunityModule.handleLogin()">✡ Entrar</button>
                <p id="login-msg-1" class="login-msg"></p>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => {
            const input = document.getElementById('login-name');
            if (input) input.focus();
        }, 120);
    }

    async function handleLogin() {
        const nameInput = document.getElementById('login-name');
        const msg = document.getElementById('login-msg-1');
        const btn = document.getElementById('login-send-btn');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name || name.length < 2) {
            msg.textContent = '⚠️ Digite um nome com pelo menos 2 caracteres';
            msg.className = 'login-msg error';
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Entrando...';

        try {
            const result = await api('/api/auth/community-guest', {
                method: 'POST',
                auth: false,
                body: { name }
            });

            sessionToken = result.session_token;
            localStorage.setItem(STORAGE_TOKEN_KEY, sessionToken);
            currentUser = result.profile;
            updateAuthUI();

            msg.textContent = '✅ Bem-vindo à comunidade!';
            msg.className = 'login-msg success';

            setTimeout(() => {
                const modal = document.getElementById('login-modal');
                if (modal) modal.classList.add('hidden');
            }, 700);

            await Promise.all([loadPosts(currentFilter), refreshFriends(), loadVerseFeed()]);
            pollNotifications();
        } catch (e) {
            msg.textContent = `❌ ${e.message}`;
            msg.className = 'login-msg error';
        } finally {
            btn.disabled = false;
            btn.textContent = '✡ Entrar';
        }
    }

    function logout() {
        sessionToken = '';
        currentUser = null;
        selectedChatFriendId = null;
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        updateAuthUI();
        loadPosts('');
        renderNeedsAuthSections();
    }

    /* ── Google Sign-In ── */

    function showGoogleLogin() {
        // Inicia o fluxo Google One Tap / popup
        if (typeof google === 'undefined' || !google.accounts) {
            alert('Google Sign-In não disponível. Verifique a conexão.');
            return;
        }
        google.accounts.id.initialize({
            client_id: '353579305375-ipp87b7cg166fmud4kaq7udlf957pieo.apps.googleusercontent.com',
            callback: handleGoogleCredential,
            ux_mode: 'popup'
        });
        google.accounts.id.prompt();
    }

    async function handleGoogleCredential(response) {
        if (!response || !response.credential) return;
        try {
            const result = await api('/api/auth/google', {
                method: 'POST',
                auth: false,
                body: { id_token: response.credential }
            });
            sessionToken = result.session_token;
            localStorage.setItem(STORAGE_TOKEN_KEY, sessionToken);
            currentUser = result.profile;
            updateAuthUI();
            await Promise.all([loadPosts(currentFilter), refreshFriends(), loadVerseFeed()]);
            pollNotifications();

            // Após login Google, verificar se precisa criar senha
            if (result.needs_password) {
                setTimeout(() => showSetPasswordModal(true), 600);
            }
        } catch (e) {
            alert(`❌ Erro ao entrar com Google: ${e.message}`);
        }
    }

    /* ── Modal: criar/alterar senha ── */

    function showSetPasswordModal(isFirstTime = false) {
        const existing = document.getElementById('set-password-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'set-password-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content login-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('set-password-modal').remove()">✕</button>
                <div class="modal-icon">🔐</div>
                <h2>${isFirstTime ? 'Crie sua senha' : 'Alterar senha'}</h2>
                <p style="color:var(--text-muted);margin-bottom:12px;font-size:0.85rem">
                    ${isFirstTime ? 'Crie uma senha para poder entrar com seu e-mail futuramente.' : 'Digite a nova senha.'}
                </p>
                <input type="password" id="sp-password" class="sacred-input" placeholder="Nova senha (mín. 6 caracteres)" maxlength="128">
                <input type="password" id="sp-confirm" class="sacred-input" placeholder="Confirmar senha" maxlength="128" style="margin-top:8px">
                <button id="sp-btn" class="sacred-btn" onclick="CommunityModule.submitSetPassword()">🔐 ${isFirstTime ? 'Criar senha' : 'Salvar senha'}</button>
                <p id="sp-msg" class="login-msg"></p>
                ${isFirstTime ? '<p style="text-align:center;margin-top:8px"><a href="#" onclick="document.getElementById(\'set-password-modal\').remove();return false" style="color:var(--text-muted);font-size:0.8rem">Pular por enquanto</a></p>' : ''}
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function submitSetPassword() {
        const passwordEl = document.getElementById('sp-password');
        const confirmEl = document.getElementById('sp-confirm');
        const msg = document.getElementById('sp-msg');
        const btn = document.getElementById('sp-btn');

        const password = passwordEl ? passwordEl.value : '';
        const confirm = confirmEl ? confirmEl.value : '';

        if (!password || password.length < 6) {
            msg.textContent = '⚠️ Senha deve ter pelo menos 6 caracteres';
            msg.className = 'login-msg error';
            return;
        }
        if (password !== confirm) {
            msg.textContent = '⚠️ As senhas não coincidem';
            msg.className = 'login-msg error';
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Salvando...';
        try {
            await api('/api/auth/set-password', {
                method: 'POST',
                body: { password, confirm_password: confirm }
            });
            msg.textContent = '✅ Senha criada! Agora você pode entrar com e-mail e senha.';
            msg.className = 'login-msg success';
            if (currentUser) currentUser.has_password = true;
            setTimeout(() => {
                const m = document.getElementById('set-password-modal');
                if (m) m.remove();
            }, 1800);
        } catch (e) {
            msg.textContent = `❌ ${e.message}`;
            msg.className = 'login-msg error';
        } finally {
            btn.disabled = false;
            btn.textContent = '🔐 Salvar senha';
        }
    }

    /* ── Modal: login com e-mail + senha ── */

    function showPasswordLoginModal() {
        const existing = document.getElementById('pw-login-modal');
        if (existing) { existing.classList.remove('hidden'); return; }

        const modal = document.createElement('div');
        modal.id = 'pw-login-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content login-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('pw-login-modal').classList.add('hidden')">✕</button>
                <div class="modal-icon">🔑</div>
                <h2>Entrar com senha</h2>
                <input type="email" id="pwl-email" class="sacred-input" placeholder="Seu e-mail" maxlength="200">
                <input type="password" id="pwl-password" class="sacred-input" placeholder="Senha" maxlength="128" style="margin-top:8px">
                <button id="pwl-btn" class="sacred-btn" onclick="CommunityModule.handlePasswordLogin()">🔑 Entrar</button>
                <p id="pwl-msg" class="login-msg"></p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function handlePasswordLogin() {
        const emailEl = document.getElementById('pwl-email');
        const passwordEl = document.getElementById('pwl-password');
        const msg = document.getElementById('pwl-msg');
        const btn = document.getElementById('pwl-btn');

        const email = emailEl ? emailEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value : '';

        if (!email || !password) {
            msg.textContent = '⚠️ E-mail e senha são obrigatórios';
            msg.className = 'login-msg error';
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Entrando...';
        try {
            const result = await api('/api/auth/login-password', {
                method: 'POST',
                auth: false,
                body: { email, password }
            });
            sessionToken = result.session_token;
            localStorage.setItem(STORAGE_TOKEN_KEY, sessionToken);
            currentUser = result.profile;
            updateAuthUI();
            const m = document.getElementById('pw-login-modal');
            if (m) m.classList.add('hidden');
            await Promise.all([loadPosts(currentFilter), refreshFriends(), loadVerseFeed()]);
            pollNotifications();
        } catch (e) {
            msg.textContent = `❌ ${e.message}`;
            msg.className = 'login-msg error';
        } finally {
            btn.disabled = false;
            btn.textContent = '🔑 Entrar';
        }
    }

    function showProfile() {
        if (!isAuthenticated()) {
            showLoginModal();
            return;
        }

        let modal = document.getElementById('profile-modal');
        if (modal) modal.remove();

        const emojis = ['🕎', '✡', '🕊️', '📖', '🙏', '⭐', '🌿', '🔥', '🌙', '👑'];
        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content profile-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('profile-modal').classList.add('hidden')">✕</button>
                <h2>⚙️ Seu Perfil</h2>

                <div class="profile-avatar-select">
                    <label>Avatar:</label>
                    <div class="emoji-grid">
                        ${emojis.map((emoji) => `
                            <button class="emoji-btn ${emoji === currentUser.avatar_emoji ? 'active' : ''}"
                                onclick="CommunityModule.selectAvatar('${emoji}', this)">${emoji}</button>
                        `).join('')}
                    </div>
                </div>

                <label>Nome:</label>
                <input type="text" id="profile-name" class="sacred-input" value="${escapeHtml(currentUser.name)}" maxlength="50">

                <label>Bio:</label>
                <textarea id="profile-bio" class="sacred-input sacred-textarea" maxlength="300">${escapeHtml(currentUser.bio || '')}</textarea>

                <button class="sacred-btn" onclick="CommunityModule.saveProfile()">💾 Salvar Perfil</button>
                <button class="btn-small" style="margin-top:8px;width:100%" onclick="CommunityModule.showSetPasswordModal(false)">🔐 ${currentUser.has_password ? 'Alterar senha' : 'Criar senha'}</button>
                <p id="profile-msg" class="login-msg"></p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function selectAvatar(emoji, btn) {
        selectedAvatar = emoji;
        document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }

    async function saveProfile() {
        const nameInput = document.getElementById('profile-name');
        const bioInput = document.getElementById('profile-bio');
        const msg = document.getElementById('profile-msg');

        const name = nameInput ? nameInput.value.trim() : '';
        const bio = bioInput ? bioInput.value.trim() : '';

        if (!name || name.length < 2) {
            msg.textContent = '⚠️ Nome precisa ter pelo menos 2 caracteres';
            msg.className = 'login-msg error';
            return;
        }

        try {
            const payload = { name, bio };
            if (selectedAvatar) payload.avatar_emoji = selectedAvatar;
            await api('/api/profile', { method: 'PUT', body: payload });
            const me = await api('/api/auth/me');
            currentUser = me;
            selectedAvatar = null;
            updateAuthUI();
            msg.textContent = '✅ Perfil salvo';
            msg.className = 'login-msg success';
        } catch (e) {
            msg.textContent = `❌ ${e.message}`;
            msg.className = 'login-msg error';
        }
    }

    async function loadPosts(type = '') {
        currentFilter = type;
        const list = document.getElementById('posts-list');
        if (!list) return;

        list.innerHTML = '<div class="loading-posts">🕎 Carregando posts...</div>';
        try {
            const qs = type ? `?type=${encodeURIComponent(type)}&limit=40` : '?limit=40';
            const data = await api(`/api/posts${qs}`, { auth: false });
            renderPosts(data.posts || []);
            updateFilterButtons(type);
        } catch (e) {
            list.innerHTML = `<p class="post-empty">${escapeHtml(e.message)}</p>`;
        }
    }

    function updateFilterButtons(type) {
        document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach((btn) => {
            const onclick = btn.getAttribute('onclick') || '';
            if (!type && onclick.includes("loadPosts('')")) btn.classList.add('active');
            if (type && onclick.includes(`loadPosts('${type}')`)) btn.classList.add('active');
        });
    }

    function renderPosts(posts) {
        const list = document.getElementById('posts-list');
        if (!list) return;

        if (!posts.length) {
            list.innerHTML = `
                <div class="post-empty">
                    <span class="empty-icon">🕊️</span>
                    <p>Nenhuma mensagem ainda. Seja o primeiro a compartilhar!</p>
                </div>
            `;
            return;
        }

        list.innerHTML = posts.map((post) => renderPost(post)).join('');
    }

    function renderPost(post) {
        const typeIcons = { message: '💬', study: '📖', prayer: '🙏', testimony: '⭐' };
        const typeLabels = { message: 'Mensagem', study: 'Estudo', prayer: 'Oração', testimony: 'Testemunho' };
        const icon = typeIcons[post.type] || '💬';
        const label = typeLabels[post.type] || 'Mensagem';
        const likes = Number(post.likes || 0);
        const isAuthor = isAuthenticated() && Number(post.profile_id) === Number(currentUser.profile_id);

        const dateStr = post.created_at
            ? new Date(post.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '';

        return `
            <div class="post-card" id="post-${post.id}">
                <div class="post-header">
                    <span class="post-avatar" onclick="CommunityModule.showPublicProfile(${post.profile_id})" style="cursor:pointer" title="Ver perfil">${post.author_avatar || '🕎'}</span>
                    <div class="post-meta">
                        <span class="post-author" onclick="CommunityModule.showPublicProfile(${post.profile_id})" style="cursor:pointer" title="Ver perfil">${escapeHtml(post.author_name || 'Anônimo')}</span>
                        <span class="post-date">${escapeHtml(dateStr)}</span>
                    </div>
                    <span class="post-type-badge">${icon} ${label}</span>
                </div>
                ${post.title ? `<h3 class="post-title">${escapeHtml(post.title)}</h3>` : ''}
                <div class="post-content">${escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="post-action-btn like-btn" data-likes="${likes}" data-liked="0" onclick="CommunityModule.toggleLikeOptimistic(${post.id})">❤️ ${likes}</button>
                    <button class="post-action-btn" onclick="CommunityModule.toggleComments(${post.id})">💬 ${Number(post.comment_count || 0)}</button>
                    ${isAuthor ? `<button class="post-action-btn post-delete" onclick="CommunityModule.deletePost(${post.id})">🗑️</button>` : ''}
                </div>
                <div id="comments-${post.id}" class="comments-section hidden"></div>
            </div>
        `;
    }

    async function createPost() {
        if (!isAuthenticated()) {
            showLoginModal();
            return;
        }

        const titleEl = document.getElementById('post-title');
        const contentEl = document.getElementById('post-content');
        const typeEl = document.getElementById('post-type');
        const content = contentEl ? contentEl.value.trim() : '';

        if (!content) {
            alert('Escreva algo para publicar!');
            return;
        }

        try {
            await api('/api/posts', {
                method: 'POST',
                body: {
                    title: titleEl ? titleEl.value.trim() : '',
                    content,
                    type: typeEl ? typeEl.value : 'message'
                }
            });

            if (titleEl) titleEl.value = '';
            if (contentEl) contentEl.value = '';
            await loadPosts(currentFilter);
        } catch (e) {
            alert(`Erro ao publicar: ${e.message}`);
        }
    }

    async function deletePost(postId) {
        if (!isAuthenticated()) return;
        if (!confirm('Tem certeza que deseja remover este post?')) return;

        try {
            await api(`/api/posts/${postId}`, { method: 'DELETE' });
            await loadPosts(currentFilter);
        } catch (e) {
            alert(`Erro ao remover: ${e.message}`);
        }
    }

    async function toggleLike(postId) {
        if (!isAuthenticated()) {
            showLoginModal();
            return;
        }

        try {
            await api(`/api/posts/${postId}/like`, { method: 'POST' });
            await loadPosts(currentFilter);
        } catch (e) {
            alert(`Erro ao curtir: ${e.message}`);
        }
    }

    async function toggleLikeOptimistic(postId) {
        if (!isAuthenticated()) { showLoginModal(); return; }

        const card = document.getElementById(`post-${postId}`);
        const likeBtn = card ? card.querySelector('.like-btn') : null;

        // Atualização imediata no DOM
        if (likeBtn) {
            const currentLikes = parseInt(likeBtn.dataset.likes || '0', 10);
            const isLiked = likeBtn.dataset.liked === '1';
            const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
            likeBtn.dataset.liked = isLiked ? '0' : '1';
            likeBtn.dataset.likes = String(newLikes);
            likeBtn.textContent = `❤️ ${newLikes}`;
            likeBtn.classList.toggle('liked', !isLiked);
            likeBtn.classList.add('like-pop');
            setTimeout(() => likeBtn.classList.remove('like-pop'), 400);
        }

        try {
            const result = await api(`/api/posts/${postId}/like`, { method: 'POST' });
            // Sincroniza com o valor real do servidor
            if (likeBtn && result) {
                likeBtn.dataset.liked = result.liked ? '1' : '0';
                likeBtn.dataset.likes = String(result.likes);
                likeBtn.textContent = `❤️ ${result.likes}`;
                likeBtn.classList.toggle('liked', result.liked);
            }
        } catch (e) {
            // Reverte no erro
            if (likeBtn) {
                const prevLiked = likeBtn.dataset.liked === '1';
                likeBtn.dataset.liked = prevLiked ? '0' : '1';
                likeBtn.dataset.likes = String(parseInt(likeBtn.dataset.likes || '0', 10) + (prevLiked ? -1 : 1));
                likeBtn.classList.toggle('liked', !prevLiked);
                likeBtn.textContent = `❤️ ${likeBtn.dataset.likes}`;
            }
        }
    }

    async function toggleComments(postId) {
        const section = document.getElementById(`comments-${postId}`);
        if (!section) return;

        if (!section.classList.contains('hidden')) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        section.innerHTML = '<div class="loading-posts">Carregando comentários...</div>';

        try {
            const data = await api(`/api/posts/${postId}`, { auth: false });
            const comments = data.comments || [];

            let html = comments.length
                ? comments.map((c) => `
                    <div class="comment">
                        <span class="comment-avatar">${c.author_avatar || '🕎'}</span>
                        <div class="comment-body">
                            <span class="comment-author">${escapeHtml(c.author_name || 'Anônimo')}</span>
                            <span class="comment-text">${escapeHtml(c.content)}</span>
                        </div>
                    </div>
                `).join('')
                : '<p class="no-comments">Sem comentários ainda</p>';

            if (isAuthenticated()) {
                html += `
                    <div class="comment-form">
                        <input type="text" id="comment-input-${postId}" class="sacred-input" placeholder="Escreva um comentário..." maxlength="500">
                        <button class="btn-small sacred-btn" onclick="CommunityModule.addComment(${postId})">Enviar</button>
                    </div>
                `;
            }

            section.innerHTML = html;
        } catch (e) {
            section.innerHTML = `<p class="no-comments">${escapeHtml(e.message)}</p>`;
        }
    }

    async function addComment(postId) {
        if (!isAuthenticated()) return;

        const input = document.getElementById(`comment-input-${postId}`);
        if (!input || !input.value.trim()) return;

        try {
            await api(`/api/posts/${postId}/comments`, {
                method: 'POST',
                body: { content: input.value.trim() }
            });
            input.value = '';
            await toggleComments(postId);
            await toggleComments(postId);
            await loadPosts(currentFilter);
        } catch (e) {
            alert(`Erro ao comentar: ${e.message}`);
        }
    }

    function switchSection(section, btn) {
        currentSection = section;
        document.querySelectorAll('.community-pane').forEach((pane) => pane.classList.add('hidden'));
        document.querySelectorAll('.community-tab-btn').forEach((b) => b.classList.remove('active'));

        const pane = document.getElementById(`community-section-${section}`);
        if (pane) pane.classList.remove('hidden');
        if (btn) btn.classList.add('active');

        if (section === 'friends' && isAuthenticated()) refreshFriends();
        if (section === 'chat' && isAuthenticated()) refreshFriends();
        if (section === 'verses' && isAuthenticated()) loadVerseFeed();
        if (!isAuthenticated()) renderNeedsAuthSections();
    }

    function renderNeedsAuthSections() {
        const simpleMessage = '<p class="post-empty">Faça login para usar esta área.</p>';
        ['friend-search-results', 'friend-requests-list', 'friends-list', 'chat-messages', 'verse-shares-feed'].forEach((id) => {
            const el = document.getElementById(id);
            if (el && !isAuthenticated()) el.innerHTML = simpleMessage;
        });
    }

    async function searchUsers() {
        if (!isAuthenticated()) return;
        const input = document.getElementById('friend-search-input');
        const box = document.getElementById('friend-search-results');
        const query = input ? input.value.trim() : '';
        if (!box) return;

        if (query.length < 2) {
            box.innerHTML = '<p class="post-empty">Digite pelo menos 2 caracteres.</p>';
            return;
        }

        try {
            const data = await api(`/api/community/users/search?q=${encodeURIComponent(query)}`);
            const users = data.users || [];
            if (!users.length) {
                box.innerHTML = '<p class="post-empty">Nenhum usuário encontrado.</p>';
                return;
            }

            box.innerHTML = users.map((u) => `
                <div class="community-list-item">
                    <div><span>${u.avatar_emoji || '🕎'}</span> ${escapeHtml(u.name)}</div>
                    <button class="btn-small" onclick="CommunityModule.requestFriend(${u.id})">Adicionar</button>
                </div>
            `).join('');
        } catch (e) {
            box.innerHTML = `<p class="post-empty">${escapeHtml(e.message)}</p>`;
        }
    }

    async function requestFriend(profileId) {
        try {
            await api('/api/community/friends/request', {
                method: 'POST',
                body: { target_profile_id: Number(profileId) }
            });
            await refreshFriends();
            alert('Pedido de amizade enviado.');
        } catch (e) {
            alert(e.message);
        }
    }

    async function respondFriend(friendshipId, action) {
        try {
            await api('/api/community/friends/respond', {
                method: 'POST',
                body: { friendship_id: Number(friendshipId), action }
            });
            await refreshFriends();
        } catch (e) {
            alert(e.message);
        }
    }

    async function refreshFriends() {
        if (!isAuthenticated()) return;

        const friendsList = document.getElementById('friends-list');
        const requestsList = document.getElementById('friend-requests-list');
        const chatSelect = document.getElementById('chat-friend-select');
        const shareTarget = document.getElementById('share-target');

        try {
            const data = await api('/api/community/friends');
            const friends = data.friends || [];
            const pendingReceived = data.pending_received || [];

            if (friendsList) {
                friendsList.innerHTML = friends.length
                    ? friends.map((f) => `
                        <div class="community-list-item">
                            <div><span>${f.avatar_emoji || '🕎'}</span> ${escapeHtml(f.name)}</div>
                            <button class="btn-small" onclick="CommunityModule.openChatWith(${f.profile_id})">Chat</button>
                        </div>
                    `).join('')
                    : '<p class="post-empty">Você ainda não possui amigos.</p>';
            }

            if (requestsList) {
                requestsList.innerHTML = pendingReceived.length
                    ? pendingReceived.map((r) => `
                        <div class="community-list-item">
                            <div><span>${r.avatar_emoji || '🕎'}</span> ${escapeHtml(r.name)}</div>
                            <div>
                                <button class="btn-small" onclick="CommunityModule.respondFriend(${r.friendship_id}, 'accept')">Aceitar</button>
                                <button class="btn-small" onclick="CommunityModule.respondFriend(${r.friendship_id}, 'reject')">Recusar</button>
                            </div>
                        </div>
                    `).join('')
                    : '<p class="post-empty">Sem pedidos pendentes.</p>';
            }

            if (chatSelect) {
                chatSelect.innerHTML = friends.length
                    ? friends.map((f) => `<option value="${f.profile_id}">${escapeHtml(f.name)}</option>`).join('')
                    : '<option value="">Nenhum amigo disponível</option>';
            }

            if (shareTarget) {
                shareTarget.innerHTML = '<option value="public">🌍 Público (comunidade)</option>' +
                    friends.map((f) => `<option value="${f.profile_id}">🔒 ${escapeHtml(f.name)}</option>`).join('');
            }

            if (!selectedChatFriendId && friends.length) {
                selectedChatFriendId = Number(friends[0].profile_id);
            }
        } catch (e) {
            if (friendsList) friendsList.innerHTML = `<p class="post-empty">${escapeHtml(e.message)}</p>`;
            if (requestsList) requestsList.innerHTML = `<p class="post-empty">${escapeHtml(e.message)}</p>`;
        }
    }

    function openChatWith(profileId) {
        const chatBtn = document.querySelector('.community-tab-btn:nth-child(3)');
        switchSection('chat', chatBtn);
        selectedChatFriendId = Number(profileId);
        const select = document.getElementById('chat-friend-select');
        if (select) select.value = String(profileId);
        loadChat();
    }

    async function loadChat() {
        if (!isAuthenticated()) return;

        const select = document.getElementById('chat-friend-select');
        const box = document.getElementById('chat-messages');
        if (!box) return;

        const friendId = Number((select && select.value) || selectedChatFriendId || 0);
        if (!friendId) {
            box.innerHTML = '<p class="post-empty">Selecione um amigo para abrir o chat.</p>';
            return;
        }

        selectedChatFriendId = friendId;

        try {
            const data = await api(`/api/community/chat/${friendId}?limit=80`);
            const messages = data.messages || [];

            if (!messages.length) {
                box.innerHTML = '<p class="post-empty">Conversa vazia. Envie a primeira mensagem.</p>';
                return;
            }

            box.innerHTML = messages.map((m) => {
                const mine = Number(m.sender_id) === Number(currentUser.profile_id);
                return `
                    <div class="chat-msg ${mine ? 'mine' : ''}">
                        <div class="chat-msg-author">${mine ? 'Você' : escapeHtml(m.sender_name || 'Amigo')}</div>
                        <div class="chat-msg-text">${escapeHtml(m.message)}</div>
                    </div>
                `;
            }).join('');

            box.scrollTop = box.scrollHeight;
        } catch (e) {
            box.innerHTML = `<p class="post-empty">${escapeHtml(e.message)}</p>`;
        }
    }

    async function sendChatMessage() {
        if (!isAuthenticated()) return;

        const input = document.getElementById('chat-message-input');
        const friendSelect = document.getElementById('chat-friend-select');
        const message = input ? input.value.trim() : '';
        const toProfileId = Number((friendSelect && friendSelect.value) || selectedChatFriendId || 0);

        if (!toProfileId) {
            alert('Selecione um amigo para conversar.');
            return;
        }

        if (!message) return;

        try {
            await api('/api/community/chat/send', {
                method: 'POST',
                body: {
                    to_profile_id: toProfileId,
                    message
                }
            });

            if (input) input.value = '';
            await loadChat();
        } catch (e) {
            alert(`Erro ao enviar mensagem: ${e.message}`);
        }
    }

    async function shareVerse() {
        if (!isAuthenticated()) return;

        const bookEl = document.getElementById('share-book');
        const chapterEl = document.getElementById('share-chapter');
        const verseEl = document.getElementById('share-verse');
        const messageEl = document.getElementById('share-message');
        const targetEl = document.getElementById('share-target');

        const book = bookEl ? bookEl.value.trim() : '';
        const chapter = Number(chapterEl ? chapterEl.value : 0);
        const verse = Number(verseEl ? verseEl.value : 0);
        const message = messageEl ? messageEl.value.trim() : '';
        const targetRaw = targetEl ? targetEl.value : 'public';

        if (!book || chapter < 1 || verse < 1) {
            alert('Informe livro, capítulo e versículo válidos.');
            return;
        }

        const payload = { book, chapter, verse, message };
        if (targetRaw && targetRaw !== 'public') {
            payload.target_profile_id = Number(targetRaw);
        }

        try {
            await api('/api/community/verses/share', {
                method: 'POST',
                body: payload
            });

            if (messageEl) messageEl.value = '';
            await loadVerseFeed();
        } catch (e) {
            alert(`Erro ao compartilhar: ${e.message}`);
        }
    }

    async function loadVerseFeed() {
        const box = document.getElementById('verse-shares-feed');
        if (!box) return;

        if (!isAuthenticated()) {
            box.innerHTML = '<p class="post-empty">Faça login para ver o feed de versículos.</p>';
            return;
        }

        box.innerHTML = '<div class="loading-posts">Carregando versículos...</div>';
        try {
            const data = await api('/api/community/verses/feed?limit=40');
            const shares = data.shares || [];
            if (!shares.length) {
                box.innerHTML = '<p class="post-empty">Nenhum versículo compartilhado ainda.</p>';
                return;
            }

            box.innerHTML = shares.map((s) => `
                <div class="community-list-item vertical">
                    <div><span>${s.author_avatar || '🕎'}</span> <strong>${escapeHtml(s.author_name || 'Anônimo')}</strong></div>
                    <div class="community-verse-ref">📖 ${escapeHtml(s.book)} ${s.chapter}:${s.verse}${s.target_name ? ` · para ${escapeHtml(s.target_name)}` : ' · público'}</div>
                    ${s.message ? `<div class="community-verse-msg">${escapeHtml(s.message)}</div>` : ''}
                </div>
            `).join('');
        } catch (e) {
            box.innerHTML = `<p class="post-empty">${escapeHtml(e.message)}</p>`;
        }
    }

    function showNotifications() {

        const existing = document.getElementById('notif-modal');
        if (existing) { existing.remove(); }

        const modal = document.createElement('div');
        modal.id = 'notif-modal';
        modal.className = 'modal';
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.innerHTML = `
            <div class="modal-content notif-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('notif-modal').remove()">✕</button>
                <div class="modal-icon">🔔</div>
                <h2>Notificações</h2>
                <div id="notif-list-content" class="notif-list">
                    <p style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Carregando...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Marcar como lidas e carregar
        api('/api/notifications/read', { method: 'POST' }).catch(() => {});
        _updateNotifBadge(0);

        api('/api/notifications', { auth: true }).then((data) => {
            const list = document.getElementById('notif-list-content');
            if (!list) return;
            const notifs = data.notifications || [];
            if (!notifs.length) {
                list.innerHTML = '<p class="post-empty">Nenhuma notificação ainda.</p>';
                return;
            }
            list.innerHTML = notifs.map((n) => `
                <div class="notif-item ${n.is_read ? '' : 'unread'}">
                    <span class="notif-msg">${escapeHtml(n.message)}</span>
                    <span class="notif-date">${new Date(n.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
            `).join('');
        }).catch(() => {
            const list = document.getElementById('notif-list-content');
            if (list) list.innerHTML = '<p class="post-empty">❌ Erro ao carregar notificações.</p>';
        });
    }

    function shareBibleVerse(bookNamePt, bookNum, chapter, verse, verseText) {
        if (!isAuthenticated()) { showLoginModal(); return; }

        const existing = document.getElementById('share-verse-modal');
        if (existing) existing.remove();

        const ref = `${bookNamePt} ${chapter}:${verse}`;
        const safeText = verseText ? verseText.slice(0, 400) : '';

        const modal = document.createElement('div');
        modal.id = 'share-verse-modal';
        modal.className = 'modal';
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('share-verse-modal').remove()">✕</button>
                <div class="modal-icon">📤</div>
                <h2>Compartilhar Versículo</h2>
                <p style="color:var(--gold-primary);font-family:var(--font-heading);font-size:0.95rem;text-align:center;margin-bottom:4px">${escapeHtml(ref)}</p>
                ${safeText ? `<p style="font-style:italic;color:var(--text-primary);font-size:0.88rem;text-align:center;margin-bottom:16px;padding:0 8px;border-left:2px solid var(--gold-primary);border-right:2px solid var(--gold-primary)">${escapeHtml(safeText)}</p>` : ''}
                <label style="font-size:0.85rem;color:var(--text-secondary)">Sua reflexão (opcional)</label>
                <textarea id="svm-message" class="sacred-input sacred-textarea" placeholder="Adicione uma reflexão sobre este versículo..." maxlength="500" rows="3"></textarea>
                <button id="svm-btn" class="sacred-btn" style="margin-top:12px;width:100%" onclick="CommunityModule._submitShareVerse('${escapeHtml(bookNamePt)}',${chapter},${verse})">📤 Compartilhar na Comunidade</button>
                <p id="svm-msg" class="login-msg"></p>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => { const ta = document.getElementById('svm-message'); if (ta) ta.focus(); }, 80);
    }

    async function _submitShareVerse(bookName, chapter, verse) {
        const msgEl = document.getElementById('svm-message');
        const btnEl = document.getElementById('svm-btn');
        const infoEl = document.getElementById('svm-msg');
        const message = msgEl ? msgEl.value.trim() : '';

        if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳ Compartilhando...'; }

        try {
            await api('/api/community/verses/share', {
                method: 'POST',
                body: { book: bookName, chapter: Number(chapter), verse: Number(verse), message }
            });
            if (infoEl) { infoEl.textContent = '✅ Compartilhado!'; infoEl.className = 'login-msg success'; }
            setTimeout(() => {
                const m = document.getElementById('share-verse-modal');
                if (m) m.remove();
                // Mudar para a aba de versículos da Comunidade
                const versesTab = document.querySelector('[onclick*="switchSection"][onclick*="verses"]');
                if (versesTab) versesTab.click();
                switchTab('tab-community');
            }, 1000);
        } catch (e) {
            if (infoEl) { infoEl.textContent = `❌ ${e.message}`; infoEl.className = 'login-msg error'; }
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = '📤 Compartilhar na Comunidade'; }
        }
    }

    function _updateNotifBadge(count) {
        const badge = document.getElementById('community-notif-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : String(count);
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    async function pollNotifications() {
        if (!isAuthenticated()) return;
        try {
            const data = await api('/api/notifications', { auth: true });
            _updateNotifBadge(data.unread_count || 0);
        } catch (_) { /* silencioso */ }
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    async function init() {
        await hydrateSession();
        await loadPosts('');

        if (isAuthenticated()) {
            await Promise.all([refreshFriends(), loadVerseFeed()]);
            // Badge de notificações
            pollNotifications();
            setInterval(pollNotifications, 30000);
        } else {
            renderNeedsAuthSections();
        }

        // Fechar qualquer modal ao clicar no backdrop
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                const id = e.target.id;
                if (id === 'public-profile-modal') { e.target.remove(); return; }
                e.target.classList.add('hidden');
            }
        });

        const chatInput = document.getElementById('chat-message-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    sendChatMessage();
                }
            });
        }

        console.log('👥 Módulo da comunidade inicializado (API própria)');
    }

    /* ── Perfil Público ── */

    async function showPublicProfile(profileId) {
        const existing = document.getElementById('public-profile-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'public-profile-modal';
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content profile-modal-content"><p style="text-align:center;padding:20px">⏳ Carregando perfil...</p></div>`;
        document.body.appendChild(modal);

        try {
            const data = await api(`/api/profiles/${profileId}`, { auth: false });
            const p = data.profile;
            const studies = data.studies || [];

            modal.querySelector('.modal-content').innerHTML = `
                <button class="modal-close-btn" onclick="document.getElementById('public-profile-modal').remove()">✕</button>
                <div style="text-align:center;margin-bottom:16px">
                    <span style="font-size:3rem">${escapeHtml(p.avatar_emoji || '🕎')}</span>
                    <h2 style="margin:8px 0 4px">${escapeHtml(p.name)}</h2>
                    ${p.bio ? `<p style="color:var(--text-muted);font-size:0.9rem">${escapeHtml(p.bio)}</p>` : ''}
                    <p style="color:var(--text-muted);font-size:0.8rem">✡ ${data.post_count} publicação(ões)</p>
                </div>
                <h3 style="margin-bottom:12px;color:var(--gold-primary)">📖 Estudos publicados</h3>
                ${studies.length === 0
                    ? '<p class="post-empty">Nenhum estudo publicado ainda.</p>'
                    : studies.map((s) => `
                        <article class="study-card" style="margin-bottom:12px">
                            ${s.title ? `<h4 style="margin:0 0 6px;color:var(--gold-primary)">${escapeHtml(s.title)}</h4>` : ''}
                            <p style="font-size:0.9rem;margin:0 0 8px">${escapeHtml(s.content.slice(0, 200))}${s.content.length > 200 ? '...' : ''}</p>
                            ${s.bible_book ? `<span class="study-ref">${escapeHtml(s.bible_book)} ${s.bible_chapter || ''}:${s.bible_verse || ''}</span>` : ''}
                        </article>
                    `).join('')}
            `;
        } catch (e) {
            modal.querySelector('.modal-content').innerHTML = `
                <button class="modal-close-btn" onclick="document.getElementById('public-profile-modal').remove()">✕</button>
                <p style="padding:20px;text-align:center">❌ Não foi possível carregar o perfil.</p>
            `;
        }
    }

    return {
        init,
        showLoginModal,
        handleLogin,
        showProfile,
        selectAvatar,
        saveProfile,
        loadPosts,
        createPost,
        deletePost,
        toggleLike,
        toggleLikeOptimistic,
        toggleComments,
        addComment,
        showNotifications,
        pollNotifications,
        shareBibleVerse,
        _submitShareVerse,
        logout,
        isAuthenticated,
        switchSection,
        searchUsers,
        requestFriend,
        respondFriend,
        openChatWith,
        loadChat,
        sendChatMessage,
        shareVerse,
        showGoogleLogin,
        handleGoogleCredential,
        showSetPasswordModal,
        submitSetPassword,
        showPasswordLoginModal,
        handlePasswordLogin,
        showPublicProfile
    };
})();
