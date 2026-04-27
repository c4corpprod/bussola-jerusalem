"""
Testes unitários básicos do backend.
Executar: cd backend && pytest tests/ -v
"""
import os
import sys
import re

# Adiciona backend ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from auth import generate_token, TOKEN_LENGTH
from psalms import get_random_salmo


def test_generate_token_length():
    """Token deve ter exatamente TOKEN_LENGTH dígitos."""
    token = generate_token()
    assert len(token) == TOKEN_LENGTH


def test_generate_token_only_digits():
    """Token deve conter apenas dígitos."""
    for _ in range(20):
        token = generate_token()
        assert re.fullmatch(r'\d+', token)


def test_generate_token_randomness():
    """Tokens consecutivos não devem ser iguais (com 10^6 espaço, colisão muito rara)."""
    tokens = {generate_token() for _ in range(50)}
    assert len(tokens) > 1


def test_get_room_key_stable():
    """Sala entre A-B deve ter mesma chave que B-A."""
    from app import get_room_key
    assert get_room_key(1, 2) == get_room_key(2, 1)
    assert get_room_key(99, 5) == "5:99"
    assert get_room_key(7, 7) == "7:7"


def test_get_random_salmo_structure():
    """Salmo retornado deve ter campos pt, he e ref."""
    s = get_random_salmo()
    assert 'pt' in s
    assert 'he' in s
    assert 'ref' in s
    assert isinstance(s['pt'], str) and len(s['pt']) > 0


def test_cors_origins_default():
    """Por padrão CORS_ORIGINS não deve ser '*'."""
    # Importa app e checa que origins é uma lista finita
    from app import _cors_origins
    assert '*' not in _cors_origins
    assert any('bussola-jerusalem' in o for o in _cors_origins)


def test_app_routes_registered():
    """Rotas críticas devem estar registradas."""
    from app import app
    rules = {r.rule for r in app.url_map.iter_rules()}
    expected = {
        '/api/auth/send-token',
        '/api/auth/verify-token',
        '/api/auth/me',
        '/api/posts',
        '/api/community/friends',
        '/api/community/chat/send',
    }
    missing = expected - rules
    assert not missing, f"Rotas faltando: {missing}"
