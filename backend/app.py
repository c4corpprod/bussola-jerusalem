# ═══════════════════════════════════════════════════════════════
# 🕎 APP.PY — Servidor Principal — Bússola para Jerusalém
# © 2026 Marcos Fernando — C4 Corporation
#
# Flask API Server — Auth, Comunidade, Perfis, Notificações
# ═══════════════════════════════════════════════════════════════

# Carrega .env antes de qualquer import que use os.environ
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from functools import wraps
from datetime import datetime, timedelta
import os
import secrets
import hashlib
import re as _re

# bcrypt com fallback para SHA-256 legado
try:
    import bcrypt as _bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False

# Rate limiting opcional
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    LIMITER_AVAILABLE = True
except ImportError:
    LIMITER_AVAILABLE = False

from database import get_db, init_db
from auth import generate_token, send_token_email, verify_token, validate_session
from psalms import get_random_salmo


def get_room_key(profile_a, profile_b):
    """Gera a chave estável de uma sala privada entre dois perfis."""
    left = min(int(profile_a), int(profile_b))
    right = max(int(profile_a), int(profile_b))
    return f"{left}:{right}"

# Google OAuth
try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

# ── Configuração ──
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '353579305375-ipp87b7cg166fmud4kaq7udlf957pieo.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')

# ── Inicialização ──
app = Flask(__name__, static_folder='../www', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# CORS restritivo: domínios autorizados via env CORS_ORIGINS (CSV)
# Default cobre Firebase Hosting + dev local.
_default_origins = ','.join([
    'https://bussola-jerusalem-34859.web.app',
    'https://bussola-jerusalem-34859.firebaseapp.com',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:8080',
    'capacitor://localhost',
    'http://localhost',
])
_cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', _default_origins).split(',') if o.strip()]
CORS(app, origins=_cors_origins, supports_credentials=True)

# Rate limiter (graceful degradation sem Redis)
if LIMITER_AVAILABLE:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["600 per hour"],
        storage_uri="memory://"
    )
else:
    class _NoopLimiter:
        def limit(self, *a, **kw):
            def dec(f): return f
            return dec
    limiter = _NoopLimiter()

# Inicializa o banco de dados
init_db()


# ═══════════════════════════════════════════════════════════════
# MIDDLEWARE — Autenticação de Sessão
# ═══════════════════════════════════════════════════════════════

def require_auth(f):
    """Decorator que exige autenticação"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            token = request.cookies.get('session_token', '')

        user = validate_session(token)
        if not user:
            return jsonify({"error": "Não autenticado. Faça login."}), 401

        request.user = user
        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Decorator que detecta auth mas não exige"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            token = request.cookies.get('session_token', '')
        request.user = validate_session(token)
        return f(*args, **kwargs)
    return decorated


# ═══════════════════════════════════════════════════════════════
# ROTAS — Páginas Estáticas
# ═══════════════════════════════════════════════════════════════

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)


# ═══════════════════════════════════════════════════════════════
# API — AUTENTICAÇÃO (2 etapas via email)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/auth/send-token', methods=['POST'])
@limiter.limit("5 per minute; 30 per hour")
def api_send_token():
    """
    Etapa 1: Envia token de verificação por email
    Body: { "email": "usuario@email.com" }
    """
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({"error": "Email é obrigatório"}), 400

    email = data['email'].strip().lower()

    # Validação básica de email
    if '@' not in email or '.' not in email:
        return jsonify({"error": "Email inválido"}), 400

    token = generate_token()
    success, message = send_token_email(email, token)

    if success:
        return jsonify({
            "success": True,
            "message": "Código enviado! Verifique seu email. 📧"
        })
    else:
        return jsonify({"error": message}), 500


@app.route('/api/auth/verify-token', methods=['POST'])
@limiter.limit("10 per minute; 60 per hour")
def api_verify_token():
    """
    Etapa 2: Verifica o token recebido por email
    Body: { "email": "usuario@email.com", "token": "123456" }
    """
    data = request.get_json()
    if not data or not data.get('email') or not data.get('token'):
        return jsonify({"error": "Email e token são obrigatórios"}), 400

    email = data['email'].strip().lower()
    token = data['token'].strip()

    success, result, message = verify_token(email, token)

    if success:
        return jsonify({
            "success": True,
            "message": message,
            "session_token": result['session_token'],
            "profile_id": result['profile_id']
        })
    else:
        return jsonify({"error": message}), 401


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def api_auth_me():
    """Retorna dados do usuário autenticado"""
    conn = get_db()
    profile = conn.execute(
        'SELECT has_password FROM profiles WHERE id = ?',
        (request.user['profile_id'],)
    ).fetchone()
    conn.close()
    has_pwd = bool(profile['has_password']) if profile else False

    return jsonify({
        "profile_id": request.user['profile_id'],
        "name": request.user['name'],
        "email": request.user['email'],
        "avatar_emoji": request.user['avatar_emoji'],
        "bio": request.user['bio'],
        "has_password": has_pwd
    })


@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def api_logout():
    """Encerra a sessão"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        token = request.cookies.get('session_token', '')

    conn = get_db()
    conn.execute('DELETE FROM sessions WHERE session_token = ?', (token,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Sessão encerrada"})


@app.route('/api/auth/google', methods=['POST'])
@limiter.limit("20 per hour")
def api_google_auth():
    """
    Login automático via Google Sign-In.
    Body: { "credential": "<Google ID Token>" }
    Verifica o token com o Google, cria perfil e sessão automaticamente.
    """
    if not GOOGLE_AUTH_AVAILABLE:
        return jsonify({"error": "Google Auth não configurado no servidor"}), 500

    data = request.get_json()
    credential = data.get('credential') if data else None
    if not credential:
        return jsonify({"error": "Token do Google é obrigatório"}), 400

    try:
        # Verifica o token com o Google
        idinfo = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        picture = idinfo.get('picture', '')

        conn = get_db()

        # Busca ou cria perfil
        profile = conn.execute('SELECT * FROM profiles WHERE email = ?', (email,)).fetchone()

        if not profile:
            cursor = conn.execute(
                'INSERT INTO profiles (name, email, is_verified, avatar_emoji) VALUES (?, ?, 1, ?)',
                (name, email, '🌟')
            )
            profile_id = cursor.lastrowid
        else:
            profile_id = profile['id']
            conn.execute(
                'UPDATE profiles SET name = ?, is_verified = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                (name, profile_id)
            )

        # Cria sessão
        from datetime import timedelta
        session_token = secrets.token_urlsafe(48)
        session_expires = datetime.now() + timedelta(days=90)
        conn.execute(
            'INSERT INTO sessions (profile_id, session_token, expires_at) VALUES (?, ?, ?)',
            (profile_id, session_token, session_expires)
        )

        conn.commit()

        # Busca perfil atualizado
        profile = conn.execute('SELECT * FROM profiles WHERE id = ?', (profile_id,)).fetchone()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Shalom, {name}! ✡",
            "session_token": session_token,
            "needs_password": not bool(profile.get('has_password')),
            "profile": {
                "id": profile['id'],
                "name": profile['name'],
                "email": profile['email'],
                "avatar_emoji": profile['avatar_emoji'],
                "bio": profile['bio'],
                "has_password": bool(profile.get('has_password'))
            }
        })

    except ValueError as e:
        return jsonify({"error": f"Token inválido: {str(e)}"}), 401
    except Exception as e:
        return jsonify({"error": f"Erro ao verificar Google: {str(e)}"}), 500


@app.route('/api/auth/config', methods=['GET'])
def api_auth_config():
    """Retorna configuração pública de autenticação (Client ID para o frontend)"""
    return jsonify({
        "google_client_id": GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID != 'YOUR_GOOGLE_CLIENT_ID' and GOOGLE_CLIENT_ID else None,
        "email_auth": True
    })


@app.route('/api/auth/community-guest', methods=['POST'])
@limiter.limit("15 per hour")
def api_community_guest_auth():
    """
    Login rápido para comunidade (sem email), com sessão persistente.
    Body: { "name": "Apelido" }
    """
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()

    if len(name) < 2:
        return jsonify({"error": "Nome deve ter ao menos 2 caracteres"}), 400

    safe = ''.join(ch for ch in name.lower() if ch.isalnum())[:16] or 'peregrino'
    suffix = secrets.token_hex(4)
    guest_email = f"guest_{safe}_{suffix}@guest.local"

    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO profiles (name, email, is_verified, avatar_emoji) VALUES (?, ?, 1, ?)',
        (name[:50], guest_email, '🕎')
    )
    profile_id = cursor.lastrowid

    session_token = secrets.token_urlsafe(48)
    session_expires = datetime.now() + timedelta(days=30)
    conn.execute(
        'INSERT INTO sessions (profile_id, session_token, expires_at) VALUES (?, ?, ?)',
        (profile_id, session_token, session_expires)
    )

    profile = conn.execute('SELECT * FROM profiles WHERE id = ?', (profile_id,)).fetchone()
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Shalom, {profile['name']}! ✡",
        "session_token": session_token,
        "profile": {
            "id": profile['id'],
            "name": profile['name'],
            "email": profile['email'],
            "avatar_emoji": profile['avatar_emoji'],
            "bio": profile['bio']
        }
    })


# ═══════════════════════════════════════════════════════════════
# API — PERFIS
# ═══════════════════════════════════════════════════════════════

@app.route('/api/profile', methods=['GET'])
@require_auth
def api_get_profile():
    """Retorna o perfil completo do usuário"""
    conn = get_db()
    profile = conn.execute(
        'SELECT * FROM profiles WHERE id = ?',
        (request.user['profile_id'],)
    ).fetchone()

    # Contagem de posts
    post_count = conn.execute(
        'SELECT COUNT(*) as count FROM posts WHERE profile_id = ?',
        (request.user['profile_id'],)
    ).fetchone()['count']

    conn.close()

    if not profile:
        return jsonify({"error": "Perfil não encontrado"}), 404

    return jsonify({
        "id": profile['id'],
        "name": profile['name'],
        "email": profile['email'],
        "bio": profile['bio'],
        "avatar_emoji": profile['avatar_emoji'],
        "is_verified": bool(profile['is_verified']),
        "post_count": post_count,
        "created_at": profile['created_at']
    })


@app.route('/api/profile', methods=['PUT'])
@require_auth
def api_update_profile():
    """Atualiza o perfil do usuário"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Dados são obrigatórios"}), 400

    conn = get_db()
    updates = []
    params = []

    if 'name' in data and data['name'].strip():
        updates.append('name = ?')
        params.append(data['name'].strip()[:50])

    if 'bio' in data:
        updates.append('bio = ?')
        params.append(data['bio'].strip()[:300])

    if 'avatar_emoji' in data and data['avatar_emoji'].strip():
        updates.append('avatar_emoji = ?')
        params.append(data['avatar_emoji'].strip()[:4])

    if not updates:
        conn.close()
        return jsonify({"error": "Nenhum campo para atualizar"}), 400

    params.append(request.user['profile_id'])
    conn.execute(
        f"UPDATE profiles SET {', '.join(updates)} WHERE id = ?",
        params
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Perfil atualizado! ✡"})


# ═══════════════════════════════════════════════════════════════
# API — POSTS DA COMUNIDADE
# ═══════════════════════════════════════════════════════════════

@app.route('/api/posts', methods=['GET'])
@optional_auth
def api_get_posts():
    """
    Lista posts da comunidade (paginado)
    Query: ?page=1&limit=20&type=message|study|prayer
    """
    page = max(1, request.args.get('page', 1, type=int))
    limit = min(50, max(1, request.args.get('limit', 20, type=int)))
    post_type = request.args.get('type', '')
    offset = (page - 1) * limit

    conn = get_db()

    query = '''
        SELECT p.*, pr.name as author_name, pr.avatar_emoji as author_avatar,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
        FROM posts p
        JOIN profiles pr ON p.profile_id = pr.id
    '''
    params = []

    if post_type:
        query += ' WHERE p.type = ?'
        params.append(post_type)

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])

    posts = conn.execute(query, params).fetchall()

    # Total de posts
    count_query = 'SELECT COUNT(*) as total FROM posts'
    if post_type:
        count_query += ' WHERE type = ?'
        total = conn.execute(count_query, [post_type] if post_type else []).fetchone()['total']
    else:
        total = conn.execute(count_query).fetchone()['total']

    conn.close()

    return jsonify({
        "posts": [dict(p) for p in posts],
        "page": page,
        "limit": limit,
        "total": total,
        "pages": max(1, (total + limit - 1) // limit)
    })


@app.route('/api/posts', methods=['POST'])
@require_auth
@limiter.limit("60 per hour")
def api_create_post():
    """
    Cria um novo post na comunidade
    Body: { "content": "...", "type": "message|study|prayer", "title": "..." }
    """
    data = request.get_json()
    if not data or not data.get('content', '').strip():
        return jsonify({"error": "Conteúdo é obrigatório"}), 400

    content = data['content'].strip()[:2000]
    post_type = data.get('type', 'message')
    title = data.get('title', '').strip()[:200]
    bible_book = data.get('bible_book', '').strip()[:80] if data.get('bible_book') else None
    bible_chapter = data.get('bible_chapter') if isinstance(data.get('bible_chapter'), int) else None
    bible_verse = data.get('bible_verse') if isinstance(data.get('bible_verse'), int) else None
    bible_translation = data.get('bible_translation', '').strip()[:20] if data.get('bible_translation') else None

    if post_type not in ('message', 'study', 'prayer', 'testimony'):
        post_type = 'message'

    conn = get_db()
    cursor = conn.execute(
        '''INSERT INTO posts (profile_id, type, title, content,
           bible_book, bible_chapter, bible_verse, bible_translation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (request.user['profile_id'], post_type, title, content,
         bible_book, bible_chapter, bible_verse, bible_translation)
    )
    post_id = cursor.lastrowid
    conn.commit()

    # Busca o post criado com dados do autor
    post = conn.execute(
        '''SELECT p.*, pr.name as author_name, pr.avatar_emoji as author_avatar
           FROM posts p JOIN profiles pr ON p.profile_id = pr.id WHERE p.id = ?''',
        (post_id,)
    ).fetchone()

    conn.close()

    return jsonify({
        "success": True,
        "message": "Post publicado! 🕎",
        "post": dict(post)
    }), 201


@app.route('/api/posts/<int:post_id>', methods=['GET'])
@optional_auth
def api_get_post(post_id):
    """Retorna um post específico com comentários"""
    conn = get_db()

    post = conn.execute(
        '''SELECT p.*, pr.name as author_name, pr.avatar_emoji as author_avatar
           FROM posts p JOIN profiles pr ON p.profile_id = pr.id WHERE p.id = ?''',
        (post_id,)
    ).fetchone()

    if not post:
        conn.close()
        return jsonify({"error": "Post não encontrado"}), 404

    comments = conn.execute(
        '''SELECT c.*, pr.name as author_name, pr.avatar_emoji as author_avatar
           FROM comments c JOIN profiles pr ON c.profile_id = pr.id
           WHERE c.post_id = ? ORDER BY c.created_at ASC''',
        (post_id,)
    ).fetchall()

    conn.close()

    return jsonify({
        "post": dict(post),
        "comments": [dict(c) for c in comments]
    })


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@require_auth
def api_delete_post(post_id):
    """Deleta um post (apenas o autor)"""
    conn = get_db()
    post = conn.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()

    if not post:
        conn.close()
        return jsonify({"error": "Post não encontrado"}), 404

    if post['profile_id'] != request.user['profile_id']:
        conn.close()
        return jsonify({"error": "Sem permissão"}), 403

    conn.execute('DELETE FROM posts WHERE id = ?', (post_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Post removido"})


# ═══════════════════════════════════════════════════════════════
# API — COMENTÁRIOS
# ═══════════════════════════════════════════════════════════════

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
@require_auth
def api_create_comment(post_id):
    """Adiciona um comentário a um post"""
    data = request.get_json()
    if not data or not data.get('content', '').strip():
        return jsonify({"error": "Conteúdo é obrigatório"}), 400

    content = data['content'].strip()[:500]

    conn = get_db()

    # Verifica se o post existe
    post = conn.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({"error": "Post não encontrado"}), 404

    cursor = conn.execute(
        'INSERT INTO comments (post_id, profile_id, content) VALUES (?, ?, ?)',
        (post_id, request.user['profile_id'], content)
    )

    # Cria notificação para o autor do post (se não for ele mesmo)
    if post['profile_id'] != request.user['profile_id']:
        conn.execute(
            '''INSERT INTO notifications (profile_id, type, message, reference_id) 
               VALUES (?, 'comment', ?, ?)''',
            (post['profile_id'],
             f"💬 {request.user['name']} comentou no seu post",
             post_id)
        )

    conn.commit()

    comment = conn.execute(
        '''SELECT c.*, pr.name as author_name, pr.avatar_emoji as author_avatar
           FROM comments c JOIN profiles pr ON c.profile_id = pr.id WHERE c.id = ?''',
        (cursor.lastrowid,)
    ).fetchone()

    conn.close()

    return jsonify({
        "success": True,
        "comment": dict(comment)
    }), 201


# ═══════════════════════════════════════════════════════════════
# API — LIKES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
@require_auth
def api_toggle_like(post_id):
    """Dá ou remove like em um post"""
    conn = get_db()

    post = conn.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({"error": "Post não encontrado"}), 404

    existing = conn.execute(
        'SELECT * FROM likes WHERE post_id = ? AND profile_id = ?',
        (post_id, request.user['profile_id'])
    ).fetchone()

    if existing:
        # Remove like
        conn.execute('DELETE FROM likes WHERE id = ?', (existing['id'],))
        conn.execute('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?', (post_id,))
        liked = False
    else:
        # Adiciona like
        conn.execute(
            'INSERT INTO likes (post_id, profile_id) VALUES (?, ?)',
            (post_id, request.user['profile_id'])
        )
        conn.execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', (post_id,))
        liked = True

        # Notifica o autor
        if post['profile_id'] != request.user['profile_id']:
            conn.execute(
                '''INSERT INTO notifications (profile_id, type, message, reference_id) 
                   VALUES (?, 'like', ?, ?)''',
                (post['profile_id'],
                 f"❤️ {request.user['name']} curtiu seu post",
                 post_id)
            )

    conn.commit()

    new_count = conn.execute(
        'SELECT likes FROM posts WHERE id = ?', (post_id,)
    ).fetchone()['likes']

    conn.close()

    return jsonify({
        "success": True,
        "liked": liked,
        "likes": new_count
    })


# ═══════════════════════════════════════════════════════════════
# API — NOTIFICAÇÕES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/notifications', methods=['GET'])
@require_auth
def api_get_notifications():
    """Lista notificações do usuário"""
    conn = get_db()
    notifications = conn.execute(
        '''SELECT * FROM notifications 
           WHERE profile_id = ? 
           ORDER BY created_at DESC LIMIT 50''',
        (request.user['profile_id'],)
    ).fetchall()

    unread = conn.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE profile_id = ? AND is_read = 0',
        (request.user['profile_id'],)
    ).fetchone()['count']

    conn.close()

    return jsonify({
        "notifications": [dict(n) for n in notifications],
        "unread_count": unread
    })


@app.route('/api/notifications/read', methods=['POST'])
@require_auth
def api_mark_notifications_read():
    """Marca todas as notificações como lidas"""
    conn = get_db()
    conn.execute(
        'UPDATE notifications SET is_read = 1 WHERE profile_id = ? AND is_read = 0',
        (request.user['profile_id'],)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True})


# ═══════════════════════════════════════════════════════════════
# API — COMUNIDADE SOCIAL (AMIZADE, CHAT, VERSÍCULOS)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/community/users/search', methods=['GET'])
@require_auth
def api_search_community_users():
    """Busca usuários por nome para enviar amizade."""
    q = (request.args.get('q') or '').strip().lower()
    if len(q) < 2:
        return jsonify({"users": []})

    conn = get_db()
    users = conn.execute(
        '''SELECT id, name, avatar_emoji
           FROM profiles
           WHERE id <> ? AND LOWER(name) LIKE ?
           ORDER BY name ASC
           LIMIT 20''',
        (request.user['profile_id'], f"%{q}%")
    ).fetchall()
    conn.close()

    return jsonify({"users": [dict(u) for u in users]})


@app.route('/api/community/friends/request', methods=['POST'])
@require_auth
def api_request_friendship():
    """Envia pedido de amizade."""
    data = request.get_json() or {}
    target_id = data.get('target_profile_id')

    if not isinstance(target_id, int):
        return jsonify({"error": "target_profile_id inválido"}), 400
    if target_id == request.user['profile_id']:
        return jsonify({"error": "Você não pode adicionar a si mesmo"}), 400

    conn = get_db()
    target = conn.execute('SELECT id FROM profiles WHERE id = ?', (target_id,)).fetchone()
    if not target:
        conn.close()
        return jsonify({"error": "Usuário não encontrado"}), 404

    existing = conn.execute(
        '''SELECT * FROM friendships
           WHERE (requester_id = ? AND addressee_id = ?)
              OR (requester_id = ? AND addressee_id = ?)''',
        (request.user['profile_id'], target_id, target_id, request.user['profile_id'])
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({"error": "Relacionamento já existe ou está pendente"}), 409

    conn.execute(
        'INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)',
        (request.user['profile_id'], target_id, 'pending')
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Pedido de amizade enviado"})


@app.route('/api/community/friends/respond', methods=['POST'])
@require_auth
def api_respond_friendship():
    """Aceita ou rejeita um pedido de amizade."""
    data = request.get_json() or {}
    friendship_id = data.get('friendship_id')
    action = (data.get('action') or '').strip().lower()

    if not isinstance(friendship_id, int):
        return jsonify({"error": "friendship_id inválido"}), 400
    if action not in ('accept', 'reject'):
        return jsonify({"error": "Ação inválida"}), 400

    next_status = 'accepted' if action == 'accept' else 'rejected'

    conn = get_db()
    friendship = conn.execute(
        'SELECT * FROM friendships WHERE id = ?',
        (friendship_id,)
    ).fetchone()

    if not friendship:
        conn.close()
        return jsonify({"error": "Pedido não encontrado"}), 404

    if friendship['addressee_id'] != request.user['profile_id']:
        conn.close()
        return jsonify({"error": "Sem permissão para responder este pedido"}), 403

    conn.execute(
        'UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (next_status, friendship_id)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "status": next_status})


@app.route('/api/community/friends', methods=['GET'])
@require_auth
def api_get_friendships():
    """Lista amigos aceitos e pedidos pendentes."""
    profile_id = request.user['profile_id']
    conn = get_db()

    friends = conn.execute(
        '''SELECT f.id as friendship_id,
                  CASE WHEN f.requester_id = ? THEN p2.id ELSE p1.id END as profile_id,
                  CASE WHEN f.requester_id = ? THEN p2.name ELSE p1.name END as name,
                  CASE WHEN f.requester_id = ? THEN p2.avatar_emoji ELSE p1.avatar_emoji END as avatar_emoji
           FROM friendships f
           JOIN profiles p1 ON p1.id = f.requester_id
           JOIN profiles p2 ON p2.id = f.addressee_id
           WHERE f.status = 'accepted'
             AND (f.requester_id = ? OR f.addressee_id = ?)
           ORDER BY name ASC''',
        (profile_id, profile_id, profile_id, profile_id, profile_id)
    ).fetchall()

    pending_received = conn.execute(
        '''SELECT f.id as friendship_id, p.id as profile_id, p.name, p.avatar_emoji
           FROM friendships f
           JOIN profiles p ON p.id = f.requester_id
           WHERE f.addressee_id = ? AND f.status = 'pending'
           ORDER BY f.created_at DESC''',
        (profile_id,)
    ).fetchall()

    pending_sent = conn.execute(
        '''SELECT f.id as friendship_id, p.id as profile_id, p.name, p.avatar_emoji
           FROM friendships f
           JOIN profiles p ON p.id = f.addressee_id
           WHERE f.requester_id = ? AND f.status = 'pending'
           ORDER BY f.created_at DESC''',
        (profile_id,)
    ).fetchall()

    conn.close()

    return jsonify({
        "friends": [dict(r) for r in friends],
        "pending_received": [dict(r) for r in pending_received],
        "pending_sent": [dict(r) for r in pending_sent]
    })


@app.route('/api/community/chat/send', methods=['POST'])
@require_auth
def api_send_chat_message():
    """Envia mensagem no chat privado."""
    data = request.get_json() or {}
    to_profile_id = data.get('to_profile_id')
    message = (data.get('message') or '').strip()

    if not isinstance(to_profile_id, int):
        return jsonify({"error": "to_profile_id inválido"}), 400
    if not message:
        return jsonify({"error": "Mensagem obrigatória"}), 400

    conn = get_db()
    can_chat = conn.execute(
        '''SELECT 1 FROM friendships
           WHERE status = 'accepted'
             AND ((requester_id = ? AND addressee_id = ?)
               OR (requester_id = ? AND addressee_id = ?))''',
        (request.user['profile_id'], to_profile_id, to_profile_id, request.user['profile_id'])
    ).fetchone()

    if not can_chat:
        conn.close()
        return jsonify({"error": "Chat disponível apenas entre amigos"}), 403

    room_key = get_room_key(request.user['profile_id'], to_profile_id)
    cursor = conn.execute(
        'INSERT INTO chat_messages (room_key, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)',
        (room_key, request.user['profile_id'], to_profile_id, message[:1000])
    )
    msg_id = cursor.lastrowid

    message_row = conn.execute(
        '''SELECT m.*, p.name as sender_name, p.avatar_emoji as sender_avatar
           FROM chat_messages m
           JOIN profiles p ON p.id = m.sender_id
           WHERE m.id = ?''',
        (msg_id,)
    ).fetchone()

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": dict(message_row)})


@app.route('/api/community/chat/<int:friend_id>', methods=['GET'])
@require_auth
def api_get_chat_messages(friend_id):
    """Lista mensagens de uma conversa privada."""
    limit = min(200, max(10, request.args.get('limit', 60, type=int)))
    room_key = get_room_key(request.user['profile_id'], friend_id)

    conn = get_db()
    can_chat = conn.execute(
        '''SELECT 1 FROM friendships
           WHERE status = 'accepted'
             AND ((requester_id = ? AND addressee_id = ?)
               OR (requester_id = ? AND addressee_id = ?))''',
        (request.user['profile_id'], friend_id, friend_id, request.user['profile_id'])
    ).fetchone()
    if not can_chat:
        conn.close()
        return jsonify({"error": "Conversa disponível apenas entre amigos"}), 403

    messages = conn.execute(
        '''SELECT m.*, p.name as sender_name, p.avatar_emoji as sender_avatar
           FROM chat_messages m
           JOIN profiles p ON p.id = m.sender_id
           WHERE m.room_key = ?
           ORDER BY m.created_at DESC
           LIMIT ?''',
        (room_key, limit)
    ).fetchall()
    conn.close()

    ordered = [dict(r) for r in reversed(messages)]
    return jsonify({"messages": ordered})


@app.route('/api/community/verses/share', methods=['POST'])
@require_auth
def api_share_verse():
    """Compartilha um versículo na comunidade ou para um amigo específico."""
    data = request.get_json() or {}
    book = (data.get('book') or '').strip()
    chapter = data.get('chapter')
    verse = data.get('verse')
    message = (data.get('message') or '').strip()[:500]
    target_profile_id = data.get('target_profile_id')

    if not book or not isinstance(chapter, int) or not isinstance(verse, int):
        return jsonify({"error": "Referência do versículo inválida"}), 400

    target_value = None
    if isinstance(target_profile_id, int):
        target_value = target_profile_id

    conn = get_db()
    cursor = conn.execute(
        '''INSERT INTO verse_shares (profile_id, target_profile_id, book, chapter, verse, message)
           VALUES (?, ?, ?, ?, ?, ?)''',
        (request.user['profile_id'], target_value, book[:80], chapter, verse, message)
    )

    share = conn.execute(
        '''SELECT v.*, p.name as author_name, p.avatar_emoji as author_avatar,
                  t.name as target_name
           FROM verse_shares v
           JOIN profiles p ON p.id = v.profile_id
           LEFT JOIN profiles t ON t.id = v.target_profile_id
           WHERE v.id = ?''',
        (cursor.lastrowid,)
    ).fetchone()

    conn.commit()
    conn.close()

    return jsonify({"success": True, "share": dict(share)}), 201


@app.route('/api/community/verses/feed', methods=['GET'])
@require_auth
def api_get_verse_feed():
    """Feed de versículos compartilhados (públicos + direcionados ao usuário)."""
    limit = min(100, max(10, request.args.get('limit', 40, type=int)))
    profile_id = request.user['profile_id']

    conn = get_db()
    rows = conn.execute(
        '''SELECT v.*, p.name as author_name, p.avatar_emoji as author_avatar,
                  t.name as target_name
           FROM verse_shares v
           JOIN profiles p ON p.id = v.profile_id
           LEFT JOIN profiles t ON t.id = v.target_profile_id
           WHERE v.target_profile_id IS NULL
              OR v.target_profile_id = ?
              OR v.profile_id = ?
           ORDER BY v.created_at DESC
           LIMIT ?''',
        (profile_id, profile_id, limit)
    ).fetchall()
    conn.close()

    return jsonify({"shares": [dict(r) for r in rows]})


# ═══════════════════════════════════════════════════════════════
# API — SALMO DO DIA
# ═══════════════════════════════════════════════════════════════

@app.route('/api/salmo', methods=['GET'])
def api_get_salmo():
    """Retorna um salmo aleatório em PT e Hebraico"""
    salmo = get_random_salmo()
    return jsonify(salmo)


# ═══════════════════════════════════════════════════════════════
# API — ESTATÍSTICAS PÚBLICAS
# ═══════════════════════════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
def api_stats():
    """Retorna estatísticas gerais da comunidade"""
    conn = get_db()
    
    members = conn.execute('SELECT COUNT(*) as c FROM profiles').fetchone()['c']
    posts = conn.execute('SELECT COUNT(*) as c FROM posts').fetchone()['c']
    comments = conn.execute('SELECT COUNT(*) as c FROM comments').fetchone()['c']
    
    conn.close()

    return jsonify({
        "members": members,
        "posts": posts,
        "comments": comments
    })


# ═══════════════════════════════════════════════════════════════
# API — SENHA PÓS-GOOGLE (opcional, para login futuro por e-mail)
# ═══════════════════════════════════════════════════════════════

def _hash_password(plain: str) -> str:
    """Gera hash de senha com bcrypt (fallback para SHA-256 se bcrypt indisponível)."""
    if BCRYPT_AVAILABLE:
        return _bcrypt.hashpw(plain.encode('utf-8'), _bcrypt.gensalt(12)).decode('utf-8')
    # Fallback SHA-256
    salt = os.environ.get('BJ_PASSWORD_SALT', 'bussola_salt_2026')
    return hashlib.sha256(f"{salt}:{plain}".encode()).hexdigest()


def _check_password(plain: str, hashed: str) -> bool:
    """Verifica senha contra hash — suporta bcrypt e SHA-256 legado."""
    if BCRYPT_AVAILABLE and hashed.startswith('$2b$'):
        return _bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    # Fallback SHA-256 para hashes antigos
    salt = os.environ.get('BJ_PASSWORD_SALT', 'bussola_salt_2026')
    return hashlib.sha256(f"{salt}:{plain}".encode()).hexdigest() == hashed


def _validate_password(plain: str) -> str | None:
    """Retorna mensagem de erro se senha inválida, None se OK."""
    if len(plain) < 6:
        return "Senha deve ter pelo menos 6 caracteres"
    if len(plain) > 128:
        return "Senha muito longa"
    return None


@app.route('/api/auth/set-password', methods=['POST'])
@require_auth
def api_set_password():
    """
    Permite ao usuário logado (via Google ou guest) definir/alterar senha.
    Body: { "password": "...", "confirm_password": "..." }
    """
    data = request.get_json() or {}
    password = data.get('password', '')
    confirm = data.get('confirm_password', '')

    if not password:
        return jsonify({"error": "Senha obrigatória"}), 400
    if password != confirm:
        return jsonify({"error": "As senhas não coincidem"}), 400

    err = _validate_password(password)
    if err:
        return jsonify({"error": err}), 400

    hashed = _hash_password(password)
    conn = get_db()
    conn.execute(
        'UPDATE profiles SET password_hash = ?, has_password = 1 WHERE id = ?',
        (hashed, request.user['profile_id'])
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Senha criada com sucesso! Agora você pode entrar com e-mail e senha."})


@app.route('/api/auth/login-password', methods=['POST'])
@limiter.limit("30 per hour")
def api_login_password():
    """
    Login com e-mail e senha (para usuários que já definiram senha).
    Body: { "email": "...", "password": "..." }
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "E-mail e senha são obrigatórios"}), 400

    conn = get_db()
    profile = conn.execute(
        'SELECT * FROM profiles WHERE LOWER(email) = ? AND has_password = 1',
        (email,)
    ).fetchone()

    if not profile or not _check_password(password, profile['password_hash']):
        conn.close()
        return jsonify({"error": "E-mail ou senha incorretos"}), 401

    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=30)
    conn.execute(
        'INSERT INTO sessions (profile_id, session_token, expires_at) VALUES (?, ?, ?)',
        (profile['id'], session_token, expires_at)
    )
    conn.execute('UPDATE profiles SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', (profile['id'],))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Shalom, {profile['name']}! ✡",
        "session_token": session_token,
        "profile": {
            "id": profile['id'],
            "name": profile['name'],
            "email": profile['email'],
            "avatar_emoji": profile['avatar_emoji'],
            "bio": profile['bio'],
            "has_password": True
        }
    })


# ═══════════════════════════════════════════════════════════════
# API — PERFIL PÚBLICO DE OUTROS USUÁRIOS
# ═══════════════════════════════════════════════════════════════

@app.route('/api/profiles/<int:profile_id>', methods=['GET'])
@optional_auth
def api_get_public_profile(profile_id):
    """Perfil público de qualquer usuário + seus estudos publicados"""
    conn = get_db()
    profile = conn.execute(
        'SELECT id, name, bio, avatar_emoji, is_verified, created_at FROM profiles WHERE id = ?',
        (profile_id,)
    ).fetchone()

    if not profile:
        conn.close()
        return jsonify({"error": "Perfil não encontrado"}), 404

    # Estudos publicados deste perfil
    studies = conn.execute(
        '''SELECT p.id, p.title, p.content, p.likes, p.created_at,
                  p.bible_book, p.bible_chapter, p.bible_verse, p.bible_translation,
                  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
           FROM posts p
           WHERE p.profile_id = ? AND p.type = 'study'
           ORDER BY p.created_at DESC
           LIMIT 30''',
        (profile_id,)
    ).fetchall()

    post_count = conn.execute(
        'SELECT COUNT(*) as c FROM posts WHERE profile_id = ?', (profile_id,)
    ).fetchone()['c']

    conn.close()

    return jsonify({
        "profile": dict(profile),
        "studies": [dict(s) for s in studies],
        "post_count": post_count
    })


# ═══════════════════════════════════════════════════════════════
# WEB PUSH (VAPID) — Notificações server-side
# ═══════════════════════════════════════════════════════════════

VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_SUBJECT = os.environ.get('VAPID_SUBJECT', 'mailto:c4corpbeats@gmail.com')
PUSH_ADMIN_TOKEN = os.environ.get('PUSH_ADMIN_TOKEN', '')

try:
    from pywebpush import webpush, WebPushException
    PYWEBPUSH_AVAILABLE = True
except ImportError:
    PYWEBPUSH_AVAILABLE = False


@app.route('/api/push/config', methods=['GET'])
def api_push_config():
    """Retorna a chave pública VAPID para o frontend se inscrever."""
    return jsonify({
        "enabled": bool(VAPID_PUBLIC_KEY) and PYWEBPUSH_AVAILABLE,
        "public_key": VAPID_PUBLIC_KEY
    })


@app.route('/api/push/subscribe', methods=['POST'])
@limiter.limit("30 per hour")
def api_push_subscribe():
    """Salva uma subscription do navegador. Profile opcional."""
    data = request.get_json() or {}
    sub = data.get('subscription') or {}
    endpoint = (sub.get('endpoint') or '').strip()
    keys = sub.get('keys') or {}
    p256dh = (keys.get('p256dh') or '').strip()
    auth_key = (keys.get('auth') or '').strip()

    if not endpoint or not p256dh or not auth_key:
        return jsonify({"error": "Subscription inválida"}), 400

    profile_id = None
    token = request.headers.get('Authorization', '').replace('Bearer ', '') or request.cookies.get('session_token', '')
    if token:
        user = validate_session(token)
        if user:
            profile_id = user['profile_id']

    user_agent = request.headers.get('User-Agent', '')[:255]

    conn = get_db()
    conn.execute(
        '''INSERT INTO push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(endpoint) DO UPDATE SET
               profile_id = excluded.profile_id,
               p256dh = excluded.p256dh,
               auth = excluded.auth,
               last_seen = CURRENT_TIMESTAMP''',
        (profile_id, endpoint, p256dh, auth_key, user_agent)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True})


@app.route('/api/push/unsubscribe', methods=['POST'])
def api_push_unsubscribe():
    """Remove uma subscription pelo endpoint."""
    data = request.get_json() or {}
    endpoint = (data.get('endpoint') or '').strip()
    if not endpoint:
        return jsonify({"error": "endpoint obrigatório"}), 400

    conn = get_db()
    conn.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', (endpoint,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


def _send_push_to_all(payload):
    """Envia push para todas as subscriptions ativas. Remove inválidas."""
    if not (PYWEBPUSH_AVAILABLE and VAPID_PRIVATE_KEY):
        return {"sent": 0, "removed": 0, "error": "pywebpush ou VAPID não configurado"}

    import json as _json
    conn = get_db()
    subs = conn.execute('SELECT id, endpoint, p256dh, auth FROM push_subscriptions').fetchall()
    sent = 0
    removed = 0
    for s in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": s['endpoint'],
                    "keys": {"p256dh": s['p256dh'], "auth": s['auth']}
                },
                data=_json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT}
            )
            sent += 1
        except WebPushException as e:
            # 404/410 = subscription expirada
            status = getattr(e.response, 'status_code', 0) if e.response is not None else 0
            if status in (404, 410):
                conn.execute('DELETE FROM push_subscriptions WHERE id = ?', (s['id'],))
                removed += 1
        except Exception:
            pass
    conn.commit()
    conn.close()
    return {"sent": sent, "removed": removed}


@app.route('/api/push/send-daily', methods=['POST'])
def api_push_send_daily():
    """Envia versículo do dia para todos os inscritos.
    Protegido por header X-Admin-Token (configurar PUSH_ADMIN_TOKEN no .env).
    Pode ser disparado por cron/GitHub Actions diariamente.
    """
    admin = request.headers.get('X-Admin-Token', '')
    if not PUSH_ADMIN_TOKEN or admin != PUSH_ADMIN_TOKEN:
        return jsonify({"error": "Não autorizado"}), 401

    data = request.get_json() or {}
    title = (data.get('title') or '✨ Versículo do Dia').strip()[:120]
    body = (data.get('body') or '').strip()[:500]
    if not body:
        return jsonify({"error": "body obrigatório"}), 400

    payload = {
        "title": title,
        "body": body,
        "icon": "/assets/img/icon-192.png",
        "badge": "/assets/img/icon-72.png",
        "tag": "daily-verse",
        "url": "/",
        "tab": "tab-bible"
    }
    result = _send_push_to_all(payload)
    return jsonify({"success": True, **result})


# ═══════════════════════════════════════════════════════════════
# INICIALIZAÇÃO
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("=" * 50)
    print("[*] Bussola para Jerusalem -- Servidor API")
    print("(C) 2026 Marcos Fernando -- C4 Corporation")
    print("=" * 50)
    print(f"[URL] http://localhost:5000")
    print(f"[API] http://localhost:5000/api/")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)
