import unittest
import time
import jwt
from nefrosmart import create_app

class SignaturesApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'JWT_SECRET': 'test-secret-with-at-least-32-characters',
            'ORACLE_CLIENT_DIR': '',
            'REMOTE_API_URL': '',
            'DB_DSN': ''
        })
        self.client = self.app.test_client()
        self.token = jwt.encode(
            {'sub': 'doutor_teste', 'perfis': ['ADMIN', 'MEDICO'], 'exp': time.time() + 3600},
            self.app.config['JWT_SECRET'],
            algorithm='HS256'
        )
        self.headers = {'Authorization': f'Bearer {self.token}'}

    def test_add_and_get_signature_persistence(self):
        payload = {
            'cd_paciente': 1001,
            'nome_paciente': 'Paciente de Teste',
            'data': '2026-10-30',
            'horario_id': '1',
            'horario_desc': '1º Turno (Manhã)',
            'turno': 'Manhã',
            'status': 'COMPARECIDO',
            'sn_assinado': 'S',
            'assinatura_base64': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'dt_registro': '30/10/2026 08:30:00'
        }
        res_post = self.client.post('/api/assinaturas', json=payload, headers=self.headers)
        self.assertEqual(res_post.status_code, 201)
        data = res_post.get_json()
        self.assertIn('registro', data)
        record_id = data['registro']['id']

        # Buscar por data
        res_get = self.client.get('/api/assinaturas?data=2026-10-30', headers=self.headers)
        self.assertEqual(res_get.status_code, 200)
        items = res_get.get_json()
        self.assertTrue(any(item['id'] == record_id for item in items))

        # Estatísticas do mês
        res_stats = self.client.get('/api/assinaturas/estatisticas-mes?mes=2026-10', headers=self.headers)
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.get_json()
        self.assertIn('2026-10-30', stats['por_dia'])

        # Excluir/Limpar
        res_del = self.client.delete(f'/api/assinaturas/{record_id}', headers=self.headers)
        self.assertEqual(res_del.status_code, 200)

    def test_remote_token_acceptance(self):
        # Token assinado por outro servidor remoto (como 127.0.0.1)
        foreign_secret = 'another-remote-secret-key-1234567890'
        foreign_token = jwt.encode(
            {'sub': 'medico_remoto', 'perfis': ['MEDICO'], 'exp': time.time() + 3600},
            foreign_secret,
            algorithm='HS256'
        )
        headers = {'Authorization': f'Bearer {foreign_token}'}
        res = self.client.get('/api/assinaturas?data=2026-11-03', headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_local_demo_token_acceptance(self):
        headers = {'Authorization': 'Bearer local-demo'}
        res = self.client.get('/api/assinaturas?data=2026-11-03', headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_expired_token_rejection(self):
        expired_token = jwt.encode(
            {'sub': 'medico_expirado', 'perfis': ['MEDICO'], 'exp': time.time() - 3600},
            self.app.config['JWT_SECRET'],
            algorithm='HS256'
        )
        headers = {'Authorization': f'Bearer {expired_token}'}
        res = self.client.get('/api/assinaturas?data=2026-11-03', headers=headers)
        self.assertEqual(res.status_code, 401)
        self.assertIn('expirada', res.get_json()['error'])

    def test_compliance_fields_portaria_706_and_rdc_11(self):
        payload = {
            'cd_paciente': 2002,
            'nome_paciente': 'Paciente Conformidade Legal',
            'data': '2026-10-31',
            'horario_id': '2',
            'horario_desc': '2º Turno (Tarde)',
            'turno': 'Tarde',
            'status': 'COMPARECIDO',
            'sn_assinado': 'S',
            'assinatura_base64': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'dt_registro': '31/10/2026 13:00:00',
            'sn_dialisador_novo': 'S',
            'lote_dialisador': 'LOT-2026-DIAL-99',
            'num_reuso': 0,
            'tipo_assinante': 'RESPONSAVEL',
            'nome_responsavel': 'Maria da Silva (Curadora)',
            'doc_responsavel': '123.456.789-00',
            'parentesco_responsavel': 'Curadora Legal',
            'hora_inicio': '13:00',
            'hora_fim': '17:00',
            'tipo_acesso': 'FAV',
            'intercorrencias': 'SEM_INTERCORRENCIAS'
        }
        res_post = self.client.post('/api/assinaturas', json=payload, headers=self.headers)
        self.assertEqual(res_post.status_code, 201)
        data = res_post.get_json()['registro']
        self.assertEqual(data['sn_dialisador_novo'], 'S')
        self.assertEqual(data['lote_dialisador'], 'LOT-2026-DIAL-99')
        self.assertEqual(data['tipo_assinante'], 'RESPONSAVEL')
        self.assertEqual(data['nome_responsavel'], 'Maria da Silva (Curadora)')
        self.assertEqual(data['hora_inicio'], '13:00')
        self.assertEqual(data['hora_fim'], '17:00')
        self.assertTrue(len(data['hash_integridade']) == 64) # SHA-256

        # Verificar se persiste no banco SQLite
        res_get = self.client.get('/api/assinaturas?data=2026-10-31', headers=self.headers)
        self.assertEqual(res_get.status_code, 200)
        items = res_get.get_json()
        self.assertEqual(items[0]['hash_integridade'], data['hash_integridade'])

        # Limpar
        self.client.delete(f"/api/assinaturas/{data['id']}", headers=self.headers)

    def test_master_user_f015114_can_access_and_modify_any_date(self):
        master_token = jwt.encode(
            {'sub': 'ADMIN', 'perfis': ['ADMIN', 'MASTER'], 'exp': time.time() + 3600},
            self.app.config['JWT_SECRET'],
            algorithm='HS256'
        )
        headers = {'Authorization': f'Bearer {master_token}'}
        payload = {
            'cd_paciente': 9999,
            'nome_paciente': 'Paciente Futuro Master',
            'data': '2099-12-31',
            'horario_id': '1',
            'status': 'COMPARECIDO',
            'sn_assinado': 'S',
            'assinatura_base64': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        }
        res_post = self.client.post('/api/assinaturas', json=payload, headers=headers)
        self.assertEqual(res_post.status_code, 201)
        record_id = res_post.get_json()['registro']['id']
        res_del = self.client.delete(f'/api/assinaturas/{record_id}', headers=headers)
        self.assertEqual(res_del.status_code, 200)
