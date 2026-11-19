import hashlib
import os
import sqlite3
import threading
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from ..auth import token_required
from ..database import get_db_connection

bp = Blueprint('signatures', __name__)


def _get_db_path():
    """Retorna o caminho absoluto do banco SQLite de assinaturas na pasta instance."""
    instance_dir = current_app.instance_path
    os.makedirs(instance_dir, exist_ok=True)
    return os.path.join(instance_dir, 'nefrosmart_signatures.db')


def get_signatures_db():
    """Conecta ao banco SQLite com suporte a dicionários."""
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def calculate_integrity_hash(record):
    """
    Gera hash criptográfico SHA-256 integrando dados da sessão, signatário, dialisador e imagem,
    assegurando conformidade com:
    - Lei Federal nº 14.063/2020 (Assinaturas Eletrônicas em Saúde)
    - Portaria SAS/MS nº 706/2014 e Portaria GM/MS nº 1.675/2018 (CFID / APAC TRS)
    - RDC Anvisa nº 11/2014 Art. 35 (Rastreabilidade e 1º Uso de Dialisador)
    - Lei Federal nº 13.787/2018 e Resolução CFM nº 1.821/2007 (Prontuário Eletrônico)
    - Normas SMSA-BH / SUS-BH e Lei Estadual MG nº 13.317/1999
    """
    raw_str = (
        f"{record.get('id')}|{record.get('cd_paciente')}|{record.get('data')}|"
        f"{record.get('horario_id')}|{record.get('tipo_assinante')}|{record.get('nome_responsavel')}|"
        f"{record.get('doc_responsavel')}|{record.get('motivo_responsavel')}|"
        f"{record.get('sn_dialisador_novo')}|{record.get('lote_dialisador')}|"
        f"{record.get('dt_primeiro_uso_dialisador')}|{record.get('num_reuso')}|"
        f"{record.get('hora_inicio')}|{record.get('hora_fim')}|"
        f"{record.get('tipo_acesso')}|{record.get('intercorrencias')}|"
        f"{record.get('cd_procedimento_sus')}|{record.get('cd_cid')}|"
        f"{record.get('dt_registro')}|{record.get('hora_registro')}|"
        f"{record.get('usuario_registro')}|{record.get('assinatura_base64') or ''}"
    )
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()


def init_signatures_table():
    """Garante que a tabela e índices existam no banco SQLite, aplicando migrações automáticas."""
    conn = get_signatures_db()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS assinatura_hemodialise (
                    id TEXT PRIMARY KEY,
                    cd_paciente INTEGER NOT NULL,
                    nome_paciente TEXT,
                    data TEXT NOT NULL,
                    horario_id TEXT DEFAULT '1',
                    horario_desc TEXT,
                    turno TEXT,
                    status TEXT NOT NULL DEFAULT 'COMPARECIDO',
                    sn_assinado TEXT DEFAULT 'S',
                    assinatura_base64 TEXT,
                    dt_registro TEXT,
                    hora_registro TEXT,
                    usuario_registro TEXT,
                    observacao TEXT,
                    sn_dialisador_novo TEXT DEFAULT 'N',
                    lote_dialisador TEXT DEFAULT '',
                    dt_primeiro_uso_dialisador TEXT DEFAULT '',
                    num_reuso INTEGER DEFAULT 0,
                    tipo_assinante TEXT DEFAULT 'PACIENTE',
                    nome_responsavel TEXT DEFAULT '',
                    doc_responsavel TEXT DEFAULT '',
                    parentesco_responsavel TEXT DEFAULT '',
                    motivo_responsavel TEXT DEFAULT '',
                    hora_inicio TEXT DEFAULT '',
                    hora_fim TEXT DEFAULT '',
                    tipo_acesso TEXT DEFAULT 'FAV',
                    intercorrencias TEXT DEFAULT 'SEM_INTERCORRENCIAS',
                    cd_procedimento_sus TEXT DEFAULT '03.05.01.010-7',
                    cd_cid TEXT DEFAULT 'N18.0',
                    lgpd_consentimento TEXT DEFAULT 'S',
                    hash_integridade TEXT DEFAULT '',
                    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
                    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
                )
            """)
            # Migração dinâmica para bancos SQLite já existentes
            cursor = conn.execute("PRAGMA table_info(assinatura_hemodialise)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            new_columns = [
                ("sn_dialisador_novo", "TEXT DEFAULT 'N'"),
                ("lote_dialisador", "TEXT DEFAULT ''"),
                ("dt_primeiro_uso_dialisador", "TEXT DEFAULT ''"),
                ("num_reuso", "INTEGER DEFAULT 0"),
                ("tipo_assinante", "TEXT DEFAULT 'PACIENTE'"),
                ("nome_responsavel", "TEXT DEFAULT ''"),
                ("doc_responsavel", "TEXT DEFAULT ''"),
                ("parentesco_responsavel", "TEXT DEFAULT ''"),
                ("motivo_responsavel", "TEXT DEFAULT ''"),
                ("hora_inicio", "TEXT DEFAULT ''"),
                ("hora_fim", "TEXT DEFAULT ''"),
                ("tipo_acesso", "TEXT DEFAULT 'FAV'"),
                ("intercorrencias", "TEXT DEFAULT 'SEM_INTERCORRENCIAS'"),
                ("cd_procedimento_sus", "TEXT DEFAULT '03.05.01.010-7'"),
                ("cd_cid", "TEXT DEFAULT 'N18.0'"),
                ("lgpd_consentimento", "TEXT DEFAULT 'S'"),
                ("hash_integridade", "TEXT DEFAULT ''")
            ]
            for col_name, col_def in new_columns:
                if col_name not in existing_cols:
                    try:
                        conn.execute(f"ALTER TABLE assinatura_hemodialise ADD COLUMN {col_name} {col_def}")
                    except Exception:
                        pass

            conn.execute("CREATE INDEX IF NOT EXISTS idx_ass_data ON assinatura_hemodialise(data)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ass_paciente ON assinatura_hemodialise(cd_paciente)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ass_mes ON assinatura_hemodialise(data)")
    finally:
        conn.close()


def _replicate_to_oracle(record):
    """
    Sincroniza a assinatura com o Oracle corporativo (tabela ASSINATURA_HEMODIALISE).
    Compatível tanto com o schema completo (Portaria 706 / Portaria 1.675 / RDC 11 Art. 35 / Lei 14.063 / SMSA-BH)
    quanto com versões anteriores da tabela.
    """
    try:
        oracle_conn = get_db_connection()
        if not oracle_conn:
            return
        sql_full = """
            MERGE INTO ASSINATURA_HEMODIALISE t
            USING (SELECT :id AS id FROM dual) s
            ON (t.ID = s.id)
            WHEN MATCHED THEN
                UPDATE SET
                    CD_PACIENTE = :cd_paciente,
                    NM_PACIENTE = :nome_paciente,
                    DT_SESSAO = TO_DATE(:data, 'YYYY-MM-DD'),
                    CD_HORARIO = :horario_id,
                    DS_TURNO = :horario_desc,
                    TP_STATUS = :status,
                    SN_ASSINADO = :sn_assinado,
                    DS_ASSINATURA_BASE64 = :assinatura_base64,
                    HR_REGISTRO = :hora_registro,
                    NM_USUARIO = :usuario_registro,
                    DS_OBSERVACAO = :observacao,
                    SN_DIALISADOR_NOVO = :sn_dialisador_novo,
                    DS_LOTE_DIALISADOR = :lote_dialisador,
                    DT_PRIMEIRO_USO_DIAL = :dt_primeiro_uso_dialisador,
                    NR_REUSO = :num_reuso,
                    TP_ASSINANTE = :tipo_assinante,
                    NM_RESPONSAVEL = :nome_responsavel,
                    NR_DOC_RESPONSAVEL = :doc_responsavel,
                    DS_PARENTESCO = :parentesco_responsavel,
                    DS_MOTIVO_RESPONSAVEL = :motivo_responsavel,
                    HR_INICIO = :hora_inicio,
                    HR_FIM = :hora_fim,
                    DS_TIPO_ACESSO = :tipo_acesso,
                    DS_INTERCORRENCIAS = :intercorrencias,
                    CD_PROCEDIMENTO_SUS = :cd_procedimento_sus,
                    CD_CID = :cd_cid,
                    SN_LGPD_CONSENTIMENTO = :lgpd_consentimento,
                    DS_HASH_INTEGRIDADE = :hash_integridade,
                    DT_ATUALIZACAO = SYSDATE
            WHEN NOT MATCHED THEN
                INSERT (
                    ID, CD_PACIENTE, NM_PACIENTE, DT_SESSAO, CD_HORARIO,
                    DS_TURNO, TP_STATUS, SN_ASSINADO, DS_ASSINATURA_BASE64,
                    HR_REGISTRO, NM_USUARIO, DS_OBSERVACAO, SN_DIALISADOR_NOVO,
                    DS_LOTE_DIALISADOR, DT_PRIMEIRO_USO_DIAL, NR_REUSO,
                    TP_ASSINANTE, NM_RESPONSAVEL, NR_DOC_RESPONSAVEL,
                    DS_PARENTESCO, DS_MOTIVO_RESPONSAVEL, HR_INICIO, HR_FIM,
                    DS_TIPO_ACESSO, DS_INTERCORRENCIAS, CD_PROCEDIMENTO_SUS,
                    CD_CID, SN_LGPD_CONSENTIMENTO, DS_HASH_INTEGRIDADE,
                    DT_CRIACAO, DT_ATUALIZACAO
                ) VALUES (
                    :id, :cd_paciente, :nome_paciente, TO_DATE(:data, 'YYYY-MM-DD'),
                    :horario_id, :horario_desc, :status, :sn_assinado,
                    :assinatura_base64, :hora_registro, :usuario_registro, :observacao,
                    :sn_dialisador_novo, :lote_dialisador, :dt_primeiro_uso_dialisador,
                    :num_reuso, :tipo_assinante, :nome_responsavel, :doc_responsavel,
                    :parentesco_responsavel, :motivo_responsavel, :hora_inicio, :hora_fim,
                    :tipo_acesso, :intercorrencias, :cd_procedimento_sus,
                    :cd_cid, :lgpd_consentimento, :hash_integridade,
                    SYSDATE, SYSDATE
                )
        """
        sql_fallback = """
            MERGE INTO ASSINATURA_HEMODIALISE t
            USING (SELECT :id AS id FROM dual) s
            ON (t.ID = s.id)
            WHEN MATCHED THEN
                UPDATE SET
                    CD_PACIENTE = :cd_paciente,
                    NM_PACIENTE = :nome_paciente,
                    DT_SESSAO = TO_DATE(:data, 'YYYY-MM-DD'),
                    CD_HORARIO = :horario_id,
                    DS_TURNO = :horario_desc,
                    TP_STATUS = :status,
                    SN_ASSINADO = :sn_assinado,
                    DS_ASSINATURA_BASE64 = :assinatura_base64,
                    HR_REGISTRO = :hora_registro,
                    NM_USUARIO = :usuario_registro,
                    DT_ATUALIZACAO = SYSDATE
            WHEN NOT MATCHED THEN
                INSERT (
                    ID, CD_PACIENTE, NM_PACIENTE, DT_SESSAO, CD_HORARIO,
                    DS_TURNO, TP_STATUS, SN_ASSINADO, DS_ASSINATURA_BASE64,
                    HR_REGISTRO, NM_USUARIO, DT_CRIACAO, DT_ATUALIZACAO
                ) VALUES (
                    :id, :cd_paciente, :nome_paciente, TO_DATE(:data, 'YYYY-MM-DD'),
                    :horario_id, :horario_desc, :status, :sn_assinado,
                    :assinatura_base64, :hora_registro, :usuario_registro,
                    SYSDATE, SYSDATE
                )
        """
        params_base = {
            'id': record['id'],
            'cd_paciente': int(record['cd_paciente']),
            'nome_paciente': (record.get('nome_paciente') or '')[:100],
            'data': record['data'],
            'horario_id': str(record.get('horario_id', '1')),
            'horario_desc': (record.get('horario_desc') or '')[:50],
            'status': (record.get('status') or 'COMPARECIDO')[:20],
            'sn_assinado': (record.get('sn_assinado') or 'S')[:1],
            'assinatura_base64': record.get('assinatura_base64') or '',
            'hora_registro': (record.get('hora_registro') or '')[:10],
            'usuario_registro': (record.get('usuario_registro') or 'SISTEMA')[:30],
        }
        params_full = {
            **params_base,
            'observacao': (record.get('observacao') or '')[:1000],
            'sn_dialisador_novo': (record.get('sn_dialisador_novo') or 'N')[:1],
            'lote_dialisador': (record.get('lote_dialisador') or '')[:50],
            'dt_primeiro_uso_dialisador': (record.get('dt_primeiro_uso_dialisador') or '')[:20],
            'num_reuso': int(record.get('num_reuso') or 0),
            'tipo_assinante': (record.get('tipo_assinante') or 'PACIENTE')[:20],
            'nome_responsavel': (record.get('nome_responsavel') or '')[:100],
            'doc_responsavel': (record.get('doc_responsavel') or '')[:30],
            'parentesco_responsavel': (record.get('parentesco_responsavel') or '')[:50],
            'motivo_responsavel': (record.get('motivo_responsavel') or '')[:120],
            'hora_inicio': (record.get('hora_inicio') or '')[:10],
            'hora_fim': (record.get('hora_fim') or '')[:10],
            'tipo_acesso': (record.get('tipo_acesso') or 'FAV')[:30],
            'intercorrencias': (record.get('intercorrencias') or 'SEM_INTERCORRENCIAS')[:250],
            'cd_procedimento_sus': (record.get('cd_procedimento_sus') or '03.05.01.010-7')[:20],
            'cd_cid': (record.get('cd_cid') or 'N18.0')[:10],
            'lgpd_consentimento': (record.get('lgpd_consentimento') or 'S')[:1],
            'hash_integridade': (record.get('hash_integridade') or '')[:64],
        }
        with oracle_conn.cursor() as cur:
            try:
                cur.execute(sql_full, params_full)
            except Exception:
                cur.execute(sql_fallback, params_base)
            oracle_conn.commit()
        oracle_conn.close()
    except Exception:
        # Falha de Oracle não afeta o funcionamento do SQLite local
        pass


@bp.record_once
def on_blueprint_init(state):
    """Executado quando o blueprint é registrado na aplicação."""
    with state.app.app_context():
        try:
            init_signatures_table()
        except Exception as e:
            print(f"[Assinaturas] Aviso ao inicializar tabela SQLite: {e}")


@bp.route('/api/assinaturas', methods=['GET'])
@token_required
def get_signatures():
    init_signatures_table()
    data_param = request.args.get('data')
    mes_param = request.args.get('mes')
    cd_paciente = request.args.get('cd_paciente')

    conn = get_signatures_db()
    try:
        query = "SELECT * FROM assinatura_hemodialise WHERE 1=1"
        params = []

        if data_param:
            query += " AND data = ?"
            params.append(data_param)
        elif mes_param:
            query += " AND data LIKE ?"
            params.append(f"{mes_param}%")

        if cd_paciente:
            query += " AND cd_paciente = ?"
            params.append(cd_paciente)

        query += " ORDER BY data DESC, horario_id ASC, nome_paciente ASC"

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        signatures_list = [dict(row) for row in rows]
        return jsonify(signatures_list)
    finally:
        conn.close()


@bp.route('/api/assinaturas/estatisticas-mes', methods=['GET'])
@token_required
def get_signatures_month_stats():
    """Retorna contagem de comparecimentos para cada dia do mês."""
    init_signatures_table()
    mes = request.args.get('mes')
    if not mes:
        mes = datetime.now().strftime('%Y-%m')

    conn = get_signatures_db()
    try:
        query = """
            SELECT data, COUNT(*) as total_presentes
            FROM assinatura_hemodialise
            WHERE data LIKE ? AND status = 'COMPARECIDO'
            GROUP BY data
        """
        cursor = conn.execute(query, [f"{mes}%"])
        results = {row['data']: row['total_presentes'] for row in cursor.fetchall()}
        return jsonify({
            'mes': mes,
            'por_dia': results
        })
    finally:
        conn.close()


@bp.route('/api/assinaturas', methods=['POST'])
@token_required
def add_signature():
    init_signatures_table()
    data = request.get_json(silent=True) or {}
    cd_paciente = data.get('cd_paciente')
    dt_assinatura = data.get('data')
    horario_id = str(data.get('horario_id', '1'))

    if not cd_paciente or not dt_assinatura:
        return jsonify({'error': 'Campos cd_paciente e data são obrigatórios.'}), 400

    now = datetime.now()
    today_str = now.strftime('%Y-%m-%d')

    # Verifica se o usuario e Master (ADMIN / MASTER)
    is_master = False
    if hasattr(request, 'user') and isinstance(request.user, dict):
        sub = str(request.user.get('sub') or request.user.get('login') or '').strip().upper()
        perfis = [str(p).upper() for p in (request.user.get('perfis') or [])]
        if sub in ('ADMIN', 'MASTER') or 'MASTER' in perfis or 'ADMIN' in perfis or '940' in perfis:
            is_master = True

    if not is_master and dt_assinatura > today_str:
        return jsonify({
            'error': 'As sessões dos dias seguintes estão fechadas para assinatura para que o paciente não assine mais de um dia por vez.'
        }), 400

    record_id = data.get('id') or f"{dt_assinatura}_{horario_id}_{cd_paciente}"

    hora_registro = data.get('hora_registro') or now.strftime('%H:%M:%S')
    dt_registro = data.get('dt_registro') or now.strftime('%d/%m/%Y %H:%M:%S')

    usuario_registro = ''
    if hasattr(request, 'user') and isinstance(request.user, dict):
        usuario_registro = request.user.get('sub') or request.user.get('login') or ''

    # Normaliza caso assinatura_base64 venha aninhada ou direta
    raw_sig = data.get('assinatura_base64') or data.get('assinatura') or ''
    if isinstance(raw_sig, dict):
        raw_sig = raw_sig.get('signatureDataUrl') or raw_sig.get('assinatura_base64') or ''

    sn_dial_novo = (str(data.get('sn_dialisador_novo') or 'N')).upper()[:1]
    dt_prim_uso = str(data.get('dt_primeiro_uso_dialisador') or (dt_assinatura if sn_dial_novo == 'S' else ''))[:20]

    record = {
        'id': record_id,
        'cd_paciente': int(cd_paciente),
        'nome_paciente': str(data.get('nome_paciente') or ''),
        'data': str(dt_assinatura),
        'horario_id': horario_id,
        'horario_desc': str(data.get('horario_desc') or data.get('horario_label') or '1º Turno (Manhã)'),
        'turno': str(data.get('turno') or ''),
        'status': str(data.get('status') or 'COMPARECIDO'),
        'sn_assinado': str(data.get('sn_assinado') or 'S')[:1],
        'assinatura_base64': str(raw_sig),
        'dt_registro': str(dt_registro),
        'hora_registro': str(hora_registro),
        'usuario_registro': str(usuario_registro or data.get('usuario_registro') or 'SISTEMA'),
        'observacao': str(data.get('observacao') or ''),
        'sn_dialisador_novo': sn_dial_novo,
        'lote_dialisador': str(data.get('lote_dialisador') or '')[:50],
        'dt_primeiro_uso_dialisador': dt_prim_uso,
        'num_reuso': 0 if sn_dial_novo == 'S' else int(data.get('num_reuso', 0) or 0),
        'tipo_assinante': str(data.get('tipo_assinante') or 'PACIENTE').upper()[:20],
        'nome_responsavel': str(data.get('nome_responsavel') or '')[:100],
        'doc_responsavel': str(data.get('doc_responsavel') or '')[:30],
        'parentesco_responsavel': str(data.get('parentesco_responsavel') or '')[:50],
        'motivo_responsavel': str(data.get('motivo_responsavel') or '')[:120],
        'hora_inicio': str(data.get('hora_inicio') or '')[:10],
        'hora_fim': str(data.get('hora_fim') or '')[:10],
        'tipo_acesso': str(data.get('tipo_acesso') or 'FAV')[:30],
        'intercorrencias': str(data.get('intercorrencias') or 'SEM_INTERCORRENCIAS')[:250],
        'cd_procedimento_sus': str(data.get('cd_procedimento_sus') or '03.05.01.010-7')[:20],
        'cd_cid': str(data.get('cd_cid') or 'N18.0')[:10],
        'lgpd_consentimento': str(data.get('lgpd_consentimento') or 'S').upper()[:1],
    }
    record['hash_integridade'] = calculate_integrity_hash(record)

    conn = get_signatures_db()
    try:
        with conn:
            conn.execute("""
                INSERT INTO assinatura_hemodialise (
                    id, cd_paciente, nome_paciente, data, horario_id, horario_desc,
                    turno, status, sn_assinado, assinatura_base64, dt_registro,
                    hora_registro, usuario_registro, observacao, sn_dialisador_novo,
                    lote_dialisador, dt_primeiro_uso_dialisador, num_reuso,
                    tipo_assinante, nome_responsavel, doc_responsavel,
                    parentesco_responsavel, motivo_responsavel, hora_inicio, hora_fim,
                    tipo_acesso, intercorrencias, cd_procedimento_sus, cd_cid,
                    lgpd_consentimento, hash_integridade, atualizado_em
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
                ON CONFLICT(id) DO UPDATE SET
                    nome_paciente = excluded.nome_paciente,
                    horario_desc = excluded.horario_desc,
                    turno = excluded.turno,
                    status = excluded.status,
                    sn_assinado = excluded.sn_assinado,
                    assinatura_base64 = excluded.assinatura_base64,
                    dt_registro = excluded.dt_registro,
                    hora_registro = excluded.hora_registro,
                    usuario_registro = excluded.usuario_registro,
                    observacao = excluded.observacao,
                    sn_dialisador_novo = excluded.sn_dialisador_novo,
                    lote_dialisador = excluded.lote_dialisador,
                    dt_primeiro_uso_dialisador = excluded.dt_primeiro_uso_dialisador,
                    num_reuso = excluded.num_reuso,
                    tipo_assinante = excluded.tipo_assinante,
                    nome_responsavel = excluded.nome_responsavel,
                    doc_responsavel = excluded.doc_responsavel,
                    parentesco_responsavel = excluded.parentesco_responsavel,
                    motivo_responsavel = excluded.motivo_responsavel,
                    hora_inicio = excluded.hora_inicio,
                    hora_fim = excluded.hora_fim,
                    tipo_acesso = excluded.tipo_acesso,
                    intercorrencias = excluded.intercorrencias,
                    cd_procedimento_sus = excluded.cd_procedimento_sus,
                    cd_cid = excluded.cd_cid,
                    lgpd_consentimento = excluded.lgpd_consentimento,
                    hash_integridade = excluded.hash_integridade,
                    atualizado_em = datetime('now', 'localtime')
            """, (
                record['id'],
                record['cd_paciente'],
                record['nome_paciente'],
                record['data'],
                record['horario_id'],
                record['horario_desc'],
                record['turno'],
                record['status'],
                record['sn_assinado'],
                record['assinatura_base64'],
                record['dt_registro'],
                record['hora_registro'],
                record['usuario_registro'],
                record['observacao'],
                record['sn_dialisador_novo'],
                record['lote_dialisador'],
                record['dt_primeiro_uso_dialisador'],
                record['num_reuso'],
                record['tipo_assinante'],
                record['nome_responsavel'],
                record['doc_responsavel'],
                record['parentesco_responsavel'],
                record['motivo_responsavel'],
                record['hora_inicio'],
                record['hora_fim'],
                record['tipo_acesso'],
                record['intercorrencias'],
                record['cd_procedimento_sus'],
                record['cd_cid'],
                record['lgpd_consentimento'],
                record['hash_integridade']
            ))

        # Replicação assíncrona em segundo plano para o Oracle MV
        try:
            threading.Thread(target=_replicate_to_oracle, args=(record,), daemon=True).start()
        except Exception:
            pass

        return jsonify({
            'message': 'Assinatura e comparecimento registrados com sucesso de forma permanente.',
            'registro': record
        }), 201
    finally:
        conn.close()


@bp.route('/api/assinaturas/<string:record_id>', methods=['DELETE'])
@token_required
def delete_signature(record_id):
    init_signatures_table()
    conn = get_signatures_db()
    try:
        with conn:
            cursor = conn.execute(
                "DELETE FROM assinatura_hemodialise WHERE id = ?",
                [record_id]
            )
            if cursor.rowcount > 0:
                return jsonify({'message': 'Registro removido com sucesso.'})
        return jsonify({'error': 'Registro não encontrado.'}), 404
    finally:
        conn.close()
