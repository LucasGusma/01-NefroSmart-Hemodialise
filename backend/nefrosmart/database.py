import oracledb
from flask import current_app

def get_db_connection():
    """Estabelece e retorna uma conexão com o banco de dados Oracle."""
    try:
        return oracledb.connect(user=current_app.config['DB_USER'], password=current_app.config['DB_PASSWORD'], dsn=current_app.config['DB_DSN'])
    except oracledb.Error as error:
        print(f"!!! ERRO DE CONEXÃO ORACLE: {error} !!!")
        return None

# -----------------------------------------------------------------------------
# 4. ROTAS DA API (ENDPOINTS)
# -----------------------------------------------------------------------------

# --- FUNÇÕES AUXILIARES ---

def fetch_one(sql_query, params):
    """Função auxiliar para executar uma consulta e retornar um único resultado."""
    conn = get_db_connection()
    if not conn: return None, "Erro de conexão"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql_query, params or [])
            result = cursor.fetchone()
            return (result[0], None) if result else (None, "Não encontrado")
    except oracledb.Error as e:
        print(f"Erro na consulta: {e}")
        return None, "Erro na consulta"
    finally:
        if conn: conn.close()

def fetch_all(sql_query, params=None):
    """Função auxiliar para buscar todos os resultados de uma consulta."""
    conn = get_db_connection()
    if not conn: return None, "Erro de conexão"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql_query, params or [])
            columns = [col[0].lower() for col in cursor.description]
            data = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return data, None
    except oracledb.Error as e:
        print(f"Erro na consulta de lookup: {e}")
        return None, "Erro na consulta"
    finally:
        if conn: conn.close()
