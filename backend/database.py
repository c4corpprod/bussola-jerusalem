# ═══════════════════════════════════════════════════════════════
# 🗄️ DATABASE — Bússola para Jerusalém
# © 2026 Marcos Fernando — C4 Corporation
#
# SQLite Database — Perfis, Posts, Tokens, Notificações
# ═══════════════════════════════════════════════════════════════

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'jerusalem.db')


def get_db():
    """Retorna conexão com o banco de dados"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Cria todas as tabelas necessárias"""
    conn = get_db()
    cursor = conn.cursor()

    # ── Tabela de Perfis ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            bio TEXT DEFAULT '',
            avatar_emoji TEXT DEFAULT '🕎',
            is_verified INTEGER DEFAULT 0,
            password_hash TEXT DEFAULT NULL,
            has_password INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # ── Tabela de Tokens de Autenticação ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL,
            salmo_ref TEXT,
            is_used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
    ''')

    # ── Tabela de Sessões ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )
    ''')

    # ── Tabela de Posts da Comunidade ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL,
            type TEXT DEFAULT 'message',
            title TEXT DEFAULT '',
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            bible_book TEXT DEFAULT NULL,
            bible_chapter INTEGER DEFAULT NULL,
            bible_verse INTEGER DEFAULT NULL,
            bible_translation TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )
    ''')

    # ── Tabela de Comentários ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            profile_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )
    ''')

    # ── Tabela de Likes ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            profile_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, profile_id),
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )
    ''')

    # ── Tabela de Notificações ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            reference_id INTEGER,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )
    ''')

    # ── Tabela de Amizades ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_id INTEGER NOT NULL,
            addressee_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
            CHECK (requester_id <> addressee_id),
            UNIQUE(requester_id, addressee_id),
            FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (addressee_id) REFERENCES profiles(id) ON DELETE CASCADE
        )
    ''')

    # ── Tabela de Chat (mensagens privadas) ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_key TEXT NOT NULL,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE
        )
    ''')

    # ── Tabela de Compartilhamento de Versículos ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS verse_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL,
            target_profile_id INTEGER,
            book TEXT NOT NULL,
            chapter INTEGER NOT NULL,
            verse INTEGER NOT NULL,
            message TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (target_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
        )
    ''')

    # ── Tabela de Push Subscriptions (Web Push / VAPID) ──
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER,
            endpoint TEXT UNIQUE NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
        )
    ''')

    # ── Índices para performance ──
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_profile ON posts(profile_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id, is_read)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON auth_tokens(email, is_used)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chat_room_created ON chat_messages(room_key, created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chat_sender_created ON chat_messages(sender_id, created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_verse_shares_created ON verse_shares(created_at DESC)')

    # Migração: adiciona campos se não existirem (compat. banco antigo)
    try:
        cursor.execute('ALTER TABLE profiles ADD COLUMN password_hash TEXT DEFAULT NULL')
    except Exception:
        pass
    try:
        cursor.execute('ALTER TABLE profiles ADD COLUMN has_password INTEGER DEFAULT 0')
    except Exception:
        pass
    try:
        cursor.execute('ALTER TABLE posts ADD COLUMN bible_book TEXT DEFAULT NULL')
    except Exception:
        pass
    try:
        cursor.execute('ALTER TABLE posts ADD COLUMN bible_chapter INTEGER DEFAULT NULL')
    except Exception:
        pass
    try:
        cursor.execute('ALTER TABLE posts ADD COLUMN bible_verse INTEGER DEFAULT NULL')
    except Exception:
        pass
    try:
        cursor.execute('ALTER TABLE posts ADD COLUMN bible_translation TEXT DEFAULT NULL')
    except Exception:
        pass

    conn.commit()
    conn.close()
    print("[DB] Banco de dados inicializado com sucesso!")


if __name__ == '__main__':
    init_db()
