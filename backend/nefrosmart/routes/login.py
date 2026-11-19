from flask import Blueprint, jsonify, request, current_app
from ..database import get_db_connection
import jwt
import pyotp
import requests
import datetime
from werkzeug.security import check_password_hash

bp = Blueprint('login', __name__)


def _authenticate_sso_or_remote(usuario_raw, senha):
    """
    Valida as credenciais MV na Auth Central Service API (com fallback automatico entre o endpoint configurado,
    o servidor central localhost:8001 e a API remota MV_LOGIN_URL localhost:5000).
    Normaliza o login MV (ex: f015114 -> ADMIN) e testa tambem a grafia original se necessario.
    Retorna (True, None, remote_payload) em caso de sucesso,
    (False, 'CREDENCIAIS_INVALIDAS', None) em caso de 401/403,
    ou (False, 'INDISPONIVEL', None) se nenhum servidor de autenticacao responder.
    """
    usuario_clean = str(usuario_raw).strip()
    usuario_upper = usuario_clean.upper()
    candidate_users = [usuario_upper]
    if usuario_clean not in candidate_users:
        candidate_users.append(usuario_clean)

    totp_secret = current_app.config.get('TOTP_SECRET') or ''
    headers = {"Content-Type": "application/json"}
    if totp_secret:
        totp = pyotp.TOTP(totp_secret, interval=60)
        headers["X-API-Key"] = totp.now()

    configured_auth_url = (current_app.config.get('AUTH_SERVICE_URL') or '').strip()
    auth_urls = []
    if configured_auth_url:
        auth_urls.append(configured_auth_url)
    # Se o ambiente estiver com 127.0.0.1:8001 configurado, adiciona fallback para o servidor real localhost:8001
    default_lan_auth = 'http://localhost:8001/api/auth/login'
    if configured_auth_url and '127.0.0.1:8001' in configured_auth_url and default_lan_auth not in auth_urls:
        auth_urls.append(default_lan_auth)

    any_server_responded = False

    # 1. Tentativa via Auth Central Service SSO API
    for auth_url in auth_urls:
        for cand_user in candidate_users:
            try:
                resp = requests.post(
                    auth_url,
                    json={"usuario": cand_user, "senha": senha},
                    headers=headers,
                    timeout=5
                )
                any_server_responded = True
                if resp.status_code == 200:
                    data = resp.json() if 'application/json' in resp.headers.get('Content-Type', '') else {}
                    return True, None, data
            except requests.exceptions.RequestException as e:
                print(f"Aviso ao conectar em {auth_url}: {e}")
                break  # Passa para a proxima URL candidata se houve falha de rede/timeout

    # 2. Fallback via MV_LOGIN_URL (ex: http://localhost:5000/api/login) caso Auth Central Service nao tenha respondido
    mv_login_url = (current_app.config.get('MV_LOGIN_URL') or '').strip()
    if not any_server_responded and mv_login_url:
        for cand_user in candidate_users:
            try:
                resp = requests.post(
                    mv_login_url,
                    json={"usuario": cand_user, "senha": senha},
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                any_server_responded = True
                if resp.status_code == 200:
                    data = resp.json() if 'application/json' in resp.headers.get('Content-Type', '') else {}
                    return True, None, data
            except requests.exceptions.RequestException as e:
                print(f"Aviso ao conectar em MV_LOGIN_URL ({mv_login_url}): {e}")
                break

    if any_server_responded:
        return False, 'CREDENCIAIS_INVALIDAS', None
    return False, 'INDISPONIVEL', None


@bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    usuario = data.get('usuario')
    senha = data.get('senha')

    if not usuario or not senha:
        return jsonify({'error': 'Usuário e senha são obrigatórios.'}), 400

    usuario_clean = str(usuario).strip()
    usuario_upper = usuario_clean.upper()
    is_master_user = usuario_upper in ('ADMIN', 'MASTER')

    local_admin_user = str(current_app.config.get('LOCAL_ADMIN_USER') or '').strip()
    local_admin_hash = current_app.config.get('LOCAL_ADMIN_HASH') or ''

    # 1. Conta Administrativa Local (ou Master usando a senha local)
    is_local_admin_match = bool(local_admin_user and usuario_clean.lower() == local_admin_user.lower())
    if is_local_admin_match:
        if not isinstance(senha, str) or not local_admin_hash or not check_password_hash(local_admin_hash, senha):
            return jsonify({'error': 'Usuário ou senha inválidos.'}), 401
        demo = bool(current_app.config.get('REMOTE_API_URL')) or not all(
            current_app.config.get(key) for key in ('DB_USER', 'DB_PASSWORD', 'DB_DSN')
        )
        perfis = ['ADMIN', 'MASTER'] if is_master_user else ['ADMIN']
        token = jwt.encode({
            'sub': usuario_clean,
            'perfis': perfis,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
        }, current_app.config['JWT_SECRET'], algorithm='HS256')
        user_payload = {
            'login': usuario_clean,
            'perfis': perfis,
            'demo': demo
        }
        if is_master_user:
            user_payload['apelido'] = 'master'
        return jsonify({
            'token': token,
            'user': user_payload
        })

    # Se for o usuario Master (ADMIN / master) e a senha coincidir com o hash local, autentica imediatamente
    if is_master_user and isinstance(senha, str) and local_admin_hash and check_password_hash(local_admin_hash, senha):
        perfis = ['ADMIN', 'MASTER']
        token = jwt.encode({
            'sub': 'ADMIN',
            'perfis': perfis,
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
        }, current_app.config['JWT_SECRET'], algorithm='HS256')
        return jsonify({
            'token': token,
            'user': {
                'login': 'ADMIN',
                'perfis': perfis,
                'apelido': 'master'
            }
        }), 200

    if not current_app.config.get('JWT_SECRET') or not current_app.config.get('TOTP_SECRET'):
        return jsonify({'error': 'Autenticação MV não configurada neste ambiente. Utilize a conta local.'}), 503

    # 2. Validação de senha no MV (Auth Central Service API / MV Login)
    auth_ok, auth_err, remote_data = _authenticate_sso_or_remote(usuario_clean, senha)
    if not auth_ok:
        if auth_err == 'CREDENCIAIS_INVALIDAS':
            return jsonify({'error': 'Credenciais inválidas ou erro na autenticação.'}), 401
        return jsonify({'error': 'Serviço de autenticação (Auth Central Service) indisponível no momento.'}), 503

    # 3. Busca do Papel e Nome do Usuário no Banco Oracle MV (RBAC)
    conn = get_db_connection()
    perfis_string = "SEM_ACESSO"
    nome_usuario_mv = None
    if conn:
        try:
            with conn.cursor() as cursor:
                perfis_string = cursor.callfunc("PKG_AGENDA_HEMODIALISE.GET_PERFIL_USUARIO", str, [usuario_upper])
                try:
                    cursor.execute(
                        "SELECT nm_usuario FROM dbasgu.usuarios WHERE cd_usuario = :1",
                        [usuario_upper]
                    )
                    row = cursor.fetchone()
                    if row and row[0]:
                        nome_usuario_mv = str(row[0]).strip()
                except Exception:
                    pass
        except Exception as e:
            print(f"Erro ao buscar perfil no banco: {e}")
        finally:
            conn.close()

    lista_perfis = [
        p.strip() for p in (perfis_string or '').split(",")
        if p.strip() and p.strip() != 'SEM_ACESSO'
    ]

    # Se veio perfil da API remota e o banco local nao retornou, aproveita os perfis remotos
    if not lista_perfis and isinstance(remote_data, dict):
        remote_user = remote_data.get('user') if isinstance(remote_data.get('user'), dict) else {}
        for p in (remote_user.get('perfis') or []):
            if p and p not in lista_perfis:
                lista_perfis.append(str(p).strip())

    # Acesso Total Master para o usuário ADMIN (apelido master)
    if is_master_user:
        if 'ADMIN' not in lista_perfis:
            lista_perfis.append('ADMIN')
        if 'MASTER' not in lista_perfis:
            lista_perfis.append('MASTER')
    elif not lista_perfis or perfis_string == 'SEM_ACESSO':
        return jsonify({'error': 'Você não tem nenhum papel de acesso a este módulo.'}), 403

    login_canonical = 'ADMIN' if usuario_upper == 'ADMIN' else usuario_upper

    # 4. Geração do nosso JWT
    token_payload = {
        "sub": login_canonical,
        "perfis": lista_perfis,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
    }

    token = jwt.encode(token_payload, current_app.config['JWT_SECRET'], algorithm="HS256")

    user_data = {
        'login': login_canonical,
        'perfis': lista_perfis
    }
    if nome_usuario_mv:
        user_data['nome'] = nome_usuario_mv
    if is_master_user:
        user_data['apelido'] = 'master'

    return jsonify({
        'token': token,
        'user': user_data
    }), 200
