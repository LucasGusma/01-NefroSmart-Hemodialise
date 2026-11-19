import unittest
from unittest.mock import Mock, patch
import requests
from nefrosmart import create_app


class RemoteApiTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app({'TESTING': True, 'ORACLE_CLIENT_DIR': '', 'REMOTE_API_URL': 'http://localhost:5000', 'LOCAL_ADMIN_USER': 'lucas'}).test_client()

    def test_remote_login_preserves_status_and_response(self):
        result = Mock(status_code=401, content=b'{"error":"Credenciais invalidas"}', headers={'Content-Type': 'application/json'})
        with patch('nefrosmart.remote_api.requests.request', return_value=result) as upstream:
            response = self.client.post('/api/login', json={'usuario': 'usuario_teste', 'senha': 'senha_teste'})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(upstream.call_args.args, ('POST', 'http://localhost:5000/api/login'))
        self.assertIn(b'usuario_teste', upstream.call_args.kwargs['data'])

    def test_token_passed_to_same_remote_api(self):
        result = Mock(status_code=200, content=b'[]', headers={'Content-Type': 'application/json'})
        with patch('nefrosmart.remote_api.requests.request', return_value=result) as upstream:
            response = self.client.get('/api/pacientes', headers={'Authorization': 'Bearer token-teste'})
        self.assertEqual(response.json, [])
        self.assertEqual(upstream.call_args.kwargs['headers']['Authorization'], 'Bearer token-teste')

    def test_connection_failure_is_json(self):
        with patch('nefrosmart.remote_api.requests.request', side_effect=requests.ConnectionError):
            response = self.client.get('/api/pacientes')
        self.assertEqual(response.status_code, 503)
        self.assertIn('error', response.json)
