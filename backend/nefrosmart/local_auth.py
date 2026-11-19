"""Conta administrativa local: somente hash da senha e chave JWT no servidor."""
import json
import secrets
from pathlib import Path
from werkzeug.security import generate_password_hash

AUTH_FILE = Path(__file__).resolve().parents[1] / 'instance' / 'local-auth.json'

def read_local_auth():
    if not AUTH_FILE.exists():
        return {}
    return json.loads(AUTH_FILE.read_text(encoding='utf-8'))

def create_admin(username, password):
    settings = read_local_auth()
    settings.update(username=username, password_hash=generate_password_hash(password))
    settings.setdefault('jwt_secret', secrets.token_urlsafe(48))
    AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
    AUTH_FILE.write_text(json.dumps(settings, indent=2), encoding='utf-8')
