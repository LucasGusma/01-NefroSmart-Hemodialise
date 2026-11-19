from flask import Blueprint, jsonify, request, current_app
from ..database import get_db_connection, fetch_one, fetch_all
from ..auth import token_required, admin_required

bp = Blueprint('lookups', __name__)

@bp.route('/api/paciente/<int:codigo>', methods=['GET'])
@token_required
def get_nome_paciente(codigo):
    sql = "SELECT nm_paciente FROM paciente WHERE cd_paciente = :1 order by nm_paciente"
    nome, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

@bp.route('/api/turma/<int:codigo>', methods=['GET'])
@token_required
def get_nome_turma(codigo):
    sql = "SELECT ds_turma FROM turma_hemodialise WHERE cd_turma = :1 order by cd_turma"
    nome, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

@bp.route('/api/procedimento/<string:codigo>', methods=['GET'])
@token_required
def get_nome_procedimento(codigo):
    sql = "SELECT ds_pro_fat FROM pro_fat WHERE cd_pro_fat = :1 order by cd_pro_fat"
    nome, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

@bp.route('/api/prestador/<int:codigo>', methods=['GET'])
@token_required
def get_nome_prestador(codigo):
    sql = "SELECT nm_prestador FROM prestador WHERE cd_prestador = :1 order by cd_prestador"
    nome, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

@bp.route('/api/convenio/<int:codigo>', methods=['GET'])
@token_required
def get_nome_convenio(codigo):
    sql = "SELECT nm_convenio FROM convenio WHERE cd_convenio = :1 order by cd_convenio"
    nome, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

@bp.route('/api/origem/<int:codigo>', methods=['GET'])
@token_required
def get_ds_ori_ate(codigo):
    sql = "SELECT DS_ORI_ATE FROM ORI_ATE WHERE CD_ORI_ATE = :1 order by cd_ori_ate"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/especialidade/<int:codigo>', methods=['GET'])
@token_required
def get_ds_especialid(codigo):
    sql = "SELECT DS_ESPECIALID FROM ESPECIALID WHERE CD_ESPECIALID = :1 order by cd_especialid"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/cid/<string:codigo>', methods=['GET'])
@token_required
def get_ds_cid(codigo):
    sql = "SELECT DS_CID FROM CID WHERE CD_CID = :1 order by cd_cid"
    descricao, erro = fetch_one(sql, [codigo.upper()])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/procedimento_sus/<string:codigo>', methods=['GET'])
@token_required
def get_ds_procedimento_sus(codigo):
    sql = "SELECT DS_PROCEDIMENTO FROM PROCEDIMENTO_SUS WHERE CD_PROCEDIMENTO = :1 order by cd_procedimento"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/servico_diagnostico/<int:codigo>', methods=['GET'])
@token_required
def get_ds_ser_dis(codigo):
    sql = "SELECT DS_SER_DIS FROM SER_DIS WHERE CD_SER_DIS = :1"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/tipo_internacao/<int:codigo>', methods=['GET'])
@token_required
def get_ds_tip_int(codigo):
    sql = "SELECT DS_TIPO_INTERNACAO FROM TIPO_INTERNACAO WHERE CD_TIPO_INTERNACAO = :1"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})
 
@bp.route('/api/tipo_marcacao/<int:codigo>', methods=['GET'])
@token_required
def get_ds_tip_mar(codigo):
    sql = "SELECT DS_TIP_MAR FROM TIP_MAR WHERE CD_TIP_MAR = :1"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/local_procedimento/<int:codigo>', methods=['GET'])
@token_required
def get_ds_loc_proced(codigo):
    sql = "SELECT DS_LOC_PROCED FROM LOC_PROCED WHERE CD_LOC_PROCED = :1"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})

@bp.route('/api/cbo/<string:codigo>', methods=['GET'])
@token_required
def get_ds_cbo(codigo):
    sql = "SELECT DS_CBOS FROM CBO WHERE CD_CBOS = :1"
    descricao, erro = fetch_one(sql, [codigo])
    if erro: return jsonify({"descricao": erro}), 404
    return jsonify({"descricao": descricao})
    
@bp.route('/api/plano/<int:convenio_codigo>/<int:plano_codigo>', methods=['GET'])
@token_required
def get_nome_plano(convenio_codigo, plano_codigo):
    sql = "SELECT DS_CON_PLA FROM CON_PLA WHERE CD_CONVENIO = :1 AND CD_CON_PLA = :2"
    nome, erro = fetch_one(sql, [convenio_codigo, plano_codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

@bp.route('/api/sub_plano/<int:convenio_codigo>/<int:plano_codigo>/<int:sub_plano_codigo>', methods=['GET'])
@token_required
def get_nome_sub_plano(convenio_codigo, plano_codigo, sub_plano_codigo):
    sql = "SELECT DS_SUB_PLANO FROM SUB_PLANO WHERE CD_CONVENIO = :1 AND CD_CON_PLA = :2 AND CD_SUB_PLANO = :3"
    nome, erro = fetch_one(sql, [convenio_codigo, plano_codigo, sub_plano_codigo])
    if erro: return jsonify({"nome": erro}), 404
    return jsonify({"nome": nome})

# --- ROTAS PARA BUSCA (LOOKUP) ---

@bp.route('/api/lookup/paciente', methods=['GET'])
@token_required
def lookup_pacientes():
    search_term = request.args.get('q', '').upper()
    if not search_term or len(search_term) < 3:
        return jsonify([])
    sql = """
        SELECT cd_paciente, nm_paciente as nome_paciente
        FROM paciente
        WHERE UPPER(nm_paciente) LIKE :search_query
        ORDER BY nm_paciente
    """
    params = [f'%{search_term}%']
    lista, erro = fetch_all(sql, params)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/turma', methods=['GET'])
@token_required
def lookup_turmas():
    sql = "SELECT cd_turma, ds_turma AS nome_turma FROM turma_hemodialise ORDER BY cd_turma"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/prestador', methods=['GET'])
@token_required
def lookup_prestador():
    search_term = request.args.get('q', '').upper()
    if not search_term or len(search_term) < 3:
        return jsonify([])
    sql = """
        SELECT CD_PRESTADOR, NM_PRESTADOR as NOME_PRESTADOR
        FROM PRESTADOR
        WHERE UPPER(NM_PRESTADOR) LIKE :search_query
        AND PRESTADOR.TP_SITUACAO = 'A'
        AND PRESTADOR.CD_TIP_PRESTA = '8'
        ORDER BY NM_PRESTADOR
    """
    params = [f'%{search_term}%']
    lista, erro = fetch_all(sql, params)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

# ... (outras rotas de lookup permanecem iguais) ...
@bp.route('/api/lookup/procedimento', methods=['GET'])
@token_required
def lookup_procedimentos():
    sql = "SELECT cd_pro_fat AS cd_procedimento, ds_pro_fat AS nome_procedimento FROM pro_fat ORDER BY cd_pro_fat"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/procedimento_sus', methods=['GET'])
@token_required
def lookup_procedimento_sus():
    sql = "SELECT cd_procedimento AS cd_procedimento_sus, ds_procedimento AS nome_procedimento_sus FROM procedimento_sus where cd_procedimento in (0305010115, 0305010107) ORDER BY cd_procedimento"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/convenio', methods=['GET'])
@token_required
def lookup_convenio():
    sql = "SELECT cd_convenio, nm_convenio as nome_convenio FROM convenio where sn_ativo = 'S' ORDER BY cd_convenio"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/plano/<int:convenio_codigo>', methods=['GET'])
@token_required
def lookup_planos(convenio_codigo):
    sql = "SELECT cd_con_pla AS cd_con_plan, ds_con_pla AS nome_con_plan FROM con_pla WHERE cd_convenio = :1 ORDER BY cd_con_pla"
    lista, erro = fetch_all(sql, [convenio_codigo])
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/sub_plano/<int:convenio_codigo>/<int:plano_codigo>', methods=['GET'])
@token_required
def lookup_sub_planos(convenio_codigo, plano_codigo):
    sql = "SELECT cd_sub_plano, ds_sub_plano AS nome_sub_plano FROM sub_plano WHERE cd_convenio = :1 AND cd_con_pla = :2 ORDER BY cd_sub_plano"
    lista, erro = fetch_all(sql, [convenio_codigo, plano_codigo])
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/origem', methods=['GET'])
@token_required
def lookup_origem():
    sql = "SELECT cd_ori_ate, ds_ori_ate AS nome_ori_ate FROM ori_ate ORDER BY cd_ori_ate"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/servico_diagnostico', methods=['GET'])
@token_required
def lookup_servico():
    sql = "SELECT cd_ser_dis, ds_ser_dis AS nome_ser_dis FROM SER_DIS ORDER BY cd_ser_dis"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/tipo_marcacao', methods=['GET'])
@token_required
def lookup_tipo_marcacao():
    sql = "SELECT cd_tip_mar, ds_tip_mar AS nome_tip_mar FROM TIP_MAR ORDER BY cd_tip_mar"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/cid', methods=['GET'])
@token_required
def lookup_cid():
    sql = "SELECT cd_cid, ds_cid AS nome_cid FROM CID ORDER BY cd_cid"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/cbo', methods=['GET'])
@token_required
def lookup_cbo():
    sql = "SELECT cd_cbos AS cd_cbo_prestador, ds_cbos AS nome_cbo_prestador FROM CBO ORDER BY cd_cbos"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/local_procedimento', methods=['GET'])
@token_required
def lookup_local_procedimento():
    sql = "SELECT cd_loc_proced, ds_loc_proced AS nome_loc_proced FROM LOC_PROCED ORDER BY cd_loc_proced"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/to_internacao', methods=['GET'])
@token_required
def lookup_tipo_internacao():
    sql = "SELECT cd_tipo_internacao, ds_tipo_internacao AS nome_tipo_internacao FROM TIPO_INTERNACAO ORDER BY cd_tipo_internacao"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

@bp.route('/api/lookup/especialidade', methods=['GET'])
@token_required
def lookup_especialidade():
    sql = "SELECT cd_especialid, ds_especialid AS nome_especialid FROM ESPECIALID ORDER BY cd_especialid"
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"erro": erro}), 500
    return jsonify(lista)

