import unittest
from unittest.mock import patch
import jwt
from werkzeug.security import generate_password_hash
from nefrosmart import create_app


class ApiTests(unittest.TestCase):
    def test_local_admin_login(self):
        self.app.config.update(LOCAL_ADMIN_USER='lucas', LOCAL_ADMIN_HASH=generate_password_hash('1234'), DB_DSN='')
        with patch('nefrosmart.routes.login.requests.post') as external_auth:
            result = self.client.post('/api/login', json={'usuario': 'lucas', 'senha': '1234'})
        self.assertEqual(result.status_code, 200)
        external_auth.assert_not_called()
        claims = jwt.decode(result.json['token'], self.app.config['JWT_SECRET'], algorithms=['HS256'])
        self.assertEqual(claims['perfis'], ['ADMIN'])
        self.assertEqual(claims['sub'], 'lucas')
        self.assertTrue(result.json['user']['demo'])

    def test_local_admin_wrong_password(self):
        self.app.config.update(LOCAL_ADMIN_USER='lucas', LOCAL_ADMIN_HASH=generate_password_hash('1234'))
        result = self.client.post('/api/login', json={'usuario': 'lucas', 'senha': 'errada'})
        self.assertEqual(result.status_code, 401)
        self.assertNotIn('token', result.json)

    def setUp(self):
        self.app = create_app({'TESTING': True, 'JWT_SECRET': 'test-secret-with-at-least-32-characters', 'ORACLE_CLIENT_DIR': '', 'REMOTE_API_URL': ''})
        self.client = self.app.test_client()

    def test_health(self):
        self.assertEqual(self.client.get('/api/health').status_code, 200)

    def test_all_data_routes_require_token(self):
        for rule in self.app.url_map.iter_rules():
            if rule.endpoint in ('static', 'login.login', 'health'):
                continue
            url = str(rule)
            for name in rule.arguments:
                import re
                url = re.sub(r'<(?:\w+:)?' + name + '>', '1', url)
            method = next(m for m in rule.methods if m not in ('OPTIONS', 'HEAD'))
            with self.subTest(url=url, method=method):
                self.assertEqual(self.client.open(url, method=method).status_code, 401)

    def test_reader_cannot_modify(self):
        token = jwt.encode({'sub': 'reader', 'perfis': ['LEITURA']}, self.app.config['JWT_SECRET'], algorithm='HS256')
        result = self.client.post('/api/pacientes', json={}, headers={'Authorization': 'Bearer ' + token})
        self.assertEqual(result.status_code, 403)

    def test_patient_list_uses_database_service(self):
        token = jwt.encode({'sub': 'reader', 'perfis': ['LEITURA']}, self.app.config['JWT_SECRET'], algorithm='HS256')
        with patch('nefrosmart.routes.patients.fetch_all', return_value=([{'cd_paciente': 1}], None)):
            result = self.client.get('/api/pacientes', headers={'Authorization': 'Bearer ' + token})
        self.assertEqual(result.json, [{'cd_paciente': 1}])

    def test_mv_login_lowercase_f015114_normalizes_and_grants_master(self):
        self.app.config.update(
            TOTP_SECRET='TOTP_SECRET_EXEMPLO_AQUI',
            AUTH_SERVICE_URL='http://localhost:8001/api/auth/login',
            DB_DSN=''
        )
        with patch('nefrosmart.routes.login.requests.post') as mock_post, \
             patch('nefrosmart.routes.login.get_db_connection', return_value=None):
            mock_post.return_value.status_code = 200
            mock_post.return_value.headers = {'Content-Type': 'application/json'}
            mock_post.return_value.json.return_value = {'token': 'ext', 'user': {'login': 'ADMIN'}}
            result = self.client.post('/api/login', json={'usuario': 'f015114', 'senha': 'mv_password'})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['user']['login'], 'ADMIN')
        self.assertIn('MASTER', result.json['user']['perfis'])
        self.assertIn('ADMIN', result.json['user']['perfis'])
        # Verifica que enviou ADMIN em maiusculo para a Auth Central Service API
        sent_json = mock_post.call_args.kwargs['json']
        self.assertEqual(sent_json['usuario'], 'ADMIN')
