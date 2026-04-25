# ═══════════════════════════════════════════════════════════════
# 🔐 AUTH — Bússola para Jerusalém
# © 2026 Marcos Fernando — C4 Corporation
#
# Autenticação em 2 etapas via token por email
# Cada token vem com um Salmo aleatório em PT e Hebraico
# ═══════════════════════════════════════════════════════════════

import smtplib
import secrets
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from psalms import get_random_salmo, format_salmo_for_email
from database import get_db

# ── Configurações SMTP (Gmail) ──
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_EMAIL = 'c4corpbeats@gmail.com'
SMTP_APP_PASSWORD = 'umuzhzeudijtvicc'

# ── Configurações de Token ──
TOKEN_LENGTH = 6
TOKEN_EXPIRY_MINUTES = 15


def generate_token():
    """Gera um token numérico de 6 dígitos"""
    return ''.join(secrets.choice(string.digits) for _ in range(TOKEN_LENGTH))


def send_token_email(to_email, token):
    """
    Envia o token de verificação por email com um Salmo aleatório.
    Retorna (success: bool, message: str)
    """
    salmo = get_random_salmo()
    salmo_text = format_salmo_for_email(salmo)

    subject = f"🕎 Bússola para Jerusalém — Seu código: {token}"

    html_body = f"""
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto;
                background: #1a0f04; color: #e8d5a3; padding: 30px; border-radius: 16px;
                border: 2px solid #c4a35a;">
        
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">🕎</span>
            <h1 style="color: #c4a35a; font-size: 20px; letter-spacing: 3px; margin: 10px 0;">
                Bússola para Jerusalém
            </h1>
            <p style="color: #8b7332; font-size: 12px; letter-spacing: 2px;">
                ─── ✡ ───
            </p>
        </div>

        <div style="text-align: center; margin: 25px 0;">
            <p style="color: #e8d5a3; font-size: 14px; margin-bottom: 15px;">
                Seu código de verificação é:
            </p>
            <div style="background: #2a1a08; border: 2px solid #c4a35a; border-radius: 12px;
                        padding: 20px; display: inline-block;">
                <span style="font-size: 36px; font-weight: bold; color: #ffd700;
                             letter-spacing: 12px; font-family: monospace;">
                    {token}
                </span>
            </div>
            <p style="color: #8b7332; font-size: 12px; margin-top: 10px;">
                ⏳ Este código expira em {TOKEN_EXPIRY_MINUTES} minutos
            </p>
        </div>

        <div style="border-top: 1px solid #c4a35a33; border-bottom: 1px solid #c4a35a33;
                    padding: 20px 0; margin: 20px 0; text-align: center;">
            <p style="color: #c4a35a; font-size: 12px; letter-spacing: 1px; margin-bottom: 8px;">
                ✦ PALAVRA DO DIA ✦
            </p>
            <p style="color: #c4a35a; font-size: 11px; margin-bottom: 5px;">
                📖 {salmo['ref']}
            </p>
            <p style="color: #e8d5a3; font-size: 14px; font-style: italic; line-height: 1.6;
                      margin-bottom: 10px;">
                "{salmo['pt']}"
            </p>
            <p style="color: #c4a35a; font-size: 14px; direction: rtl; line-height: 1.8;">
                {salmo['he']}
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px;">
            <p style="color: #8b7332; font-size: 11px;">
                Se você não solicitou este código, ignore este email.
            </p>
            <p style="color: #8b7332; font-size: 10px; margin-top: 15px; letter-spacing: 1px;">
                © 2026 Marcos Fernando — C4 Corporation
            </p>
            <p style="color: #8b7332; font-size: 10px;">
                ─── ✡ ───
            </p>
        </div>
    </div>
    """

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f'Bússola para Jerusalém <{SMTP_EMAIL}>'
        msg['To'] = to_email
        msg['Subject'] = subject

        # Versão texto puro
        text_body = f"""
🕎 Bússola para Jerusalém 🕎

Seu código de verificação: {token}
(Válido por {TOKEN_EXPIRY_MINUTES} minutos)

{salmo_text}

© 2026 Marcos Fernando — C4 Corporation
"""
        msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.send_message(msg)

        # Salva o token no banco
        save_token(to_email, token, salmo['ref'])

        return True, f"Token enviado para {to_email}"

    except smtplib.SMTPAuthenticationError:
        return False, "Erro de autenticação SMTP"
    except smtplib.SMTPException as e:
        return False, f"Erro ao enviar email: {str(e)}"
    except Exception as e:
        return False, f"Erro inesperado: {str(e)}"


def save_token(email, token, salmo_ref):
    """Salva o token no banco de dados"""
    conn = get_db()
    expires_at = datetime.now() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

    # Invalida tokens anteriores não usados
    conn.execute(
        'UPDATE auth_tokens SET is_used = 1 WHERE email = ? AND is_used = 0',
        (email,)
    )

    conn.execute(
        'INSERT INTO auth_tokens (email, token, salmo_ref, expires_at) VALUES (?, ?, ?, ?)',
        (email, token, salmo_ref, expires_at)
    )
    conn.commit()
    conn.close()


def verify_token(email, token):
    """
    Verifica se o token é válido.
    Retorna (success: bool, profile_id: int or None, message: str)
    """
    conn = get_db()
    row = conn.execute(
        '''SELECT * FROM auth_tokens 
           WHERE email = ? AND token = ? AND is_used = 0 
           ORDER BY created_at DESC LIMIT 1''',
        (email, token)
    ).fetchone()

    if not row:
        conn.close()
        return False, None, "Token inválido ou já utilizado"

    # Verifica expiração
    expires_at = datetime.fromisoformat(row['expires_at'])
    if datetime.now() > expires_at:
        conn.execute('UPDATE auth_tokens SET is_used = 1 WHERE id = ?', (row['id'],))
        conn.commit()
        conn.close()
        return False, None, "Token expirado. Solicite um novo."

    # Marca como usado
    conn.execute('UPDATE auth_tokens SET is_used = 1 WHERE id = ?', (row['id'],))

    # Cria ou busca perfil
    profile = conn.execute('SELECT * FROM profiles WHERE email = ?', (email,)).fetchone()
    
    if not profile:
        # Cria perfil novo
        cursor = conn.execute(
            'INSERT INTO profiles (name, email, is_verified) VALUES (?, ?, 1)',
            (email.split('@')[0], email)
        )
        profile_id = cursor.lastrowid
    else:
        profile_id = profile['id']
        conn.execute(
            'UPDATE profiles SET is_verified = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            (profile_id,)
        )

    # Cria sessão
    session_token = secrets.token_urlsafe(48)
    session_expires = datetime.now() + timedelta(days=30)
    conn.execute(
        'INSERT INTO sessions (profile_id, session_token, expires_at) VALUES (?, ?, ?)',
        (profile_id, session_token, session_expires)
    )

    conn.commit()
    conn.close()

    return True, {"profile_id": profile_id, "session_token": session_token}, "Autenticação bem-sucedida!"


def validate_session(session_token):
    """Valida um token de sessão. Retorna profile_id ou None"""
    if not session_token:
        return None

    conn = get_db()
    row = conn.execute(
        '''SELECT s.profile_id, s.expires_at, p.name, p.email, p.avatar_emoji, p.bio
           FROM sessions s 
           JOIN profiles p ON s.profile_id = p.id 
           WHERE s.session_token = ?''',
        (session_token,)
    ).fetchone()
    conn.close()

    if not row:
        return None

    expires_at = datetime.fromisoformat(row['expires_at'])
    if datetime.now() > expires_at:
        return None

    return dict(row)
