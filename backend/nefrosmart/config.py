import os
from pathlib import Path

# Carrega automaticamente variaveis do arquivo backend/.env caso ainda nao estejam no ambiente
_env_path = Path(__file__).resolve().parents[1] / '.env'
if _env_path.is_file():
    try:
        with open(_env_path, 'r', encoding='utf-8') as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _v = _line.split('=', 1)
                    os.environ.setdefault(_k.strip(), _v.strip())
    except Exception:
        pass


class Config:
    REMOTE_API_URL = os.environ.get('REMOTE_API_URL', '')
    JWT_SECRET = os.environ.get('JWT_SECRET', '')
    TOTP_SECRET = os.environ.get('TOTP_SECRET', 'TOTP_SECRET_EXEMPLO_AQUI')
    AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8001/api/auth/login')
    MV_LOGIN_URL = os.environ.get('MV_LOGIN_URL', 'http://localhost:5000/api/login')
    DB_USER = os.environ.get('DB_USER', '')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_DSN = os.environ.get('DB_DSN', '')
    ORACLE_CLIENT_DIR = os.environ.get('ORACLE_CLIENT_DIR', '')
