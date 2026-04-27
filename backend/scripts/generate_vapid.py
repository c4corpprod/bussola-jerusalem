"""
Gera um par de chaves VAPID para Web Push.
Uso:  python scripts/generate_vapid.py

Cole o resultado no backend/.env como:
  VAPID_PUBLIC_KEY=...
  VAPID_PRIVATE_KEY=...
  VAPID_SUBJECT=mailto:seu@email.com
  PUSH_ADMIN_TOKEN=<gere com: python -c "import secrets; print(secrets.token_hex(32))">

E no frontend (www/js/daily-verse.js) o public key será obtido via /api/push/config.
"""
import base64

try:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
except ImportError:
    print("Instale: pip install cryptography")
    raise SystemExit(1)


def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def main():
    sk = ec.generate_private_key(ec.SECP256R1())
    pk = sk.public_key()

    priv_bytes = sk.private_numbers().private_value.to_bytes(32, 'big')
    pub_bytes = pk.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print("VAPID_PUBLIC_KEY=" + b64url(pub_bytes))
    print("VAPID_PRIVATE_KEY=" + b64url(priv_bytes))


if __name__ == '__main__':
    main()
