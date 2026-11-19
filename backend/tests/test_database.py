import unittest
from unittest.mock import MagicMock, patch
from nefrosmart.database import fetch_all

class DatabaseTests(unittest.TestCase):
    def test_converts_oracle_rows_and_closes_connection(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value.__enter__.return_value
        cursor.description = [('CD_PACIENTE',), ('NOME_PACIENTE',)]
        cursor.fetchall.return_value = [(1, 'Paciente fictício')]
        with patch('nefrosmart.database.get_db_connection', return_value=connection):
            data, error = fetch_all('SELECT exemplo')
        self.assertIsNone(error)
        self.assertEqual(data, [{'cd_paciente': 1, 'nome_paciente': 'Paciente fictício'}])
        connection.close.assert_called_once()
