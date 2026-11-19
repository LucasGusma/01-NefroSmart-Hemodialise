"""Encaminha login e operações para a API NefroSmart configurada."""
import requests
from flask import current_app, jsonify, request, Response

def register_remote_api(app):
    @app.before_request
    def forward_remote_api():
        base = current_app.config.get('REMOTE_API_URL', '').rstrip('/')
        if not base or not request.path.startswith('/api/') or request.path == '/api/health':
            return None
        if request.path.startswith('/api/assinaturas'):
            return None
        if request.path == '/api/login':
            data = request.get_json(silent=True) or {}
            if data.get('usuario') == current_app.config.get('LOCAL_ADMIN_USER'):
                return None
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
        if request.headers.get('Authorization'):
            headers['Authorization'] = request.headers['Authorization']
        try:
            result = requests.request(request.method, base + request.path,
                                      params=request.args, data=request.get_data(),
                                      headers=headers, timeout=15, allow_redirects=False)
        except requests.RequestException:
            return jsonify(error='Servidor NefroSmart 127.0.0.1 indisponível. Tente novamente.'), 503
        if 'application/json' not in result.headers.get('Content-Type', ''):
            return jsonify(error='O servidor de autenticação retornou uma resposta inválida.'), 502
        return Response(result.content, status=result.status_code, content_type='application/json')
