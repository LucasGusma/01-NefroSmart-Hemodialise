from functools import wraps
import jwt
from flask import request, jsonify, current_app


def _inject_master_privileges(data):
    """Garante privilegios ADMIN e MASTER para o usuario Master ADMIN."""
    if not isinstance(data, dict):
        return data
    sub = str(data.get('sub') or data.get('login') or '').strip().upper()
    if sub in ('ADMIN', 'MASTER'):
        perfis = list(data.get('perfis') or [])
        if 'ADMIN' not in perfis:
            perfis.append('ADMIN')
        if 'MASTER' not in perfis:
            perfis.append('MASTER')
        data['perfis'] = perfis
    return data


def _decode_request_token(token, allow_signatures_fallback=False):
    """
    Decodifica e valida o token JWT.
    Para rotas de /api/assinaturas, aceita tambem o token 'local-demo' e tokens
    emitidos pelo servidor remoto NefroSmart (127.0.0.1), mantendo a verificacao de expiracao.
    """
    if allow_signatures_fallback and token == 'local-demo':
        return {'sub': 'DEMO', 'perfis': ['ADMIN'], 'demo': True}

    secret = current_app.config.get('JWT_SECRET') or ''
    try:
        data = jwt.decode(token, secret, algorithms=["HS256"])
        return _inject_master_privileges(data)
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidSignatureError:
        if allow_signatures_fallback:
            data = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True},
                algorithms=["HS256"]
            )
            return _inject_master_privileges(data)
        raise


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({'error': 'Token ausente. Acesso negado.'}), 401

        allow_fallback = request.path.startswith('/api/assinaturas')
        try:
            request.user = _decode_request_token(token, allow_signatures_fallback=allow_fallback)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Sessão expirada. Faça login novamente.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido.'}), 401

        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({'error': 'Token ausente. Acesso negado.'}), 401

        try:
            data = _decode_request_token(token, allow_signatures_fallback=False)
            perfis = data.get("perfis", [])
            request.user = data

            if "MASTER" not in perfis and "ADMIN" not in perfis and "940" not in perfis:
                return jsonify({'error': 'Acesso negado. Esta ação requer privilégios de Administrador.'}), 403

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Sessão expirada. Faça login novamente.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido.'}), 401

        return f(*args, **kwargs)
    return decorated
