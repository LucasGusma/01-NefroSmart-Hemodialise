from flask import Blueprint, jsonify, request, current_app
from ..database import get_db_connection, fetch_one, fetch_all
from ..auth import token_required, admin_required
import oracledb
from ..services.agenda import _disparar_rotina_agenda

bp = Blueprint('patients', __name__)

@bp.route('/api/pacientes', methods=['GET'])
@token_required
def get_pacientes():
    sql = """
        SELECT
            pth.cd_paciente, pac.nm_paciente AS nome_paciente, pth.cd_turma,
            turma.ds_turma AS nome_turma, pth.dt_inicio_vigencia, pth.dt_fim_vigencia,
            pth.sn_ativo, pth.sn_atendimento_apac, pth.cd_convenio,
            conv.nm_convenio AS nome_convenio, pth.cd_con_plan, cpla.ds_con_pla AS nome_con_plan,
            pth.cd_prestador, prest.nm_prestador AS nome_prestador, pth.cd_ori_ate,
            ori.ds_ori_ate AS nome_ori_ate, pth.cd_especialid, esp.ds_especialid AS nome_especialid,
            pth.cd_cid, cid.ds_cid AS nome_cid, pth.cd_procedimento,
            pro_fat.ds_pro_fat AS nome_procedimento, pth.cd_procedimento_sus,
            proc1.ds_procedimento AS nome_procedimento_sus,
            pth.cd_loc_proced, loc.ds_loc_proced AS nome_loc_proced,
            pth.cd_ser_dis, ser.ds_ser_dis AS nome_ser_dis,
            pth.cd_tip_mar, tip_mar.ds_tip_mar AS nome_tip_mar,
            pth.cd_cbo_prestador, cbo.ds_cbos AS nome_cbo_prestador,
            pth.cd_tipo_internacao, tip_int.ds_tipo_internacao AS nome_tipo_internacao,
            pth.cd_sub_plano, sub.ds_sub_plano as nome_sub_plano,
            pth.ds_acesso
        FROM usuario_banco.PACIENTE_TURMA_HEMO pth
        LEFT JOIN paciente pac ON pac.cd_paciente = pth.cd_paciente
        LEFT JOIN usuario_banco.turma_hemodialise turma ON turma.cd_turma = pth.cd_turma
        LEFT JOIN convenio conv ON conv.cd_convenio = pth.cd_convenio
        LEFT JOIN con_pla cpla ON cpla.cd_convenio = pth.cd_convenio AND cpla.cd_con_pla = pth.cd_con_plan
        LEFT JOIN prestador prest ON prest.cd_prestador = pth.cd_prestador
        LEFT JOIN ori_ate ori ON ori.cd_ori_ate = pth.cd_ori_ate
        LEFT JOIN especialid esp ON esp.cd_especialid = pth.cd_especialid
        LEFT JOIN cid ON cid.cd_cid = pth.cd_cid
        LEFT JOIN procedimento_sus proc1 ON proc1.cd_procedimento = pth.cd_procedimento_sus
        LEFT JOIN pro_fat ON pro_fat.cd_pro_fat = pth.cd_procedimento
        LEFT JOIN LOC_PROCED loc ON loc.CD_LOC_PROCED = pth.cd_loc_proced
        LEFT JOIN SER_DIS ser ON ser.cd_ser_dis = pth.cd_ser_dis
        LEFT JOIN TIP_MAR tip_mar ON tip_mar.cd_tip_mar = pth.cd_tip_mar
        LEFT JOIN CBO cbo ON cbo.cd_cbos = pth.cd_cbo_prestador
        LEFT JOIN TIPO_INTERNACAO tip_int ON tip_int.cd_tipo_internacao = pth.cd_tipo_internacao
        LEFT JOIN SUB_PLANO sub ON sub.cd_convenio = pth.cd_convenio AND sub.cd_con_pla = pth.cd_con_plan AND sub.cd_sub_plano = pth.cd_sub_plano
        ORDER BY turma.cd_turma, pac.nm_paciente
    """
    lista, erro = fetch_all(sql)
    if erro: return jsonify({"error": erro}), 500
    return jsonify(lista)

# ROTA POST MODIFICADA
@bp.route('/api/pacientes', methods=['POST'])
@admin_required
def add_paciente():
    data = request.get_json(silent=True) or {}
    
    valid_columns = [
        'cd_paciente', 'cd_turma', 'dt_inicio_vigencia', 'dt_fim_vigencia', 'sn_ativo',
        'cd_procedimento', 'cd_procedimento_sus', 'cd_prestador', 'cd_ori_ate',
        'cd_ser_dis', 'cd_tip_mar', 'cd_convenio', 'cd_con_plan', 'cd_sub_plano',
        'ds_acesso', 'cd_cid', 'cd_cbo_prestador', 'cd_loc_proced', 'cd_tipo_internacao',
        'cd_especialid', 'sn_atendimento_apac'
    ]
    
    insert_data = {key: data.get(key) for key in valid_columns}

    for key, value in insert_data.items():
        if isinstance(value, str):
            insert_data[key] = value.upper()

    sql = """
        INSERT INTO PACIENTE_TURMA_HEMO (
            cd_paciente, cd_turma, dt_inicio_vigencia, dt_fim_vigencia, sn_ativo,
            cd_procedimento, cd_procedimento_sus, cd_prestador, cd_ori_ate,
            cd_ser_dis, cd_tip_mar, cd_convenio, cd_con_plan, cd_sub_plano,
            ds_acesso, cd_cid, cd_cbo_prestador, cd_loc_proced, cd_tipo_internacao,
            cd_especialid, sn_atendimento_apac
        ) VALUES (
            :cd_paciente, :cd_turma, TO_DATE(:dt_inicio_vigencia, 'YYYY-MM-DD'),
            TO_DATE(:dt_fim_vigencia, 'YYYY-MM-DD'), :sn_ativo, :cd_procedimento,
            :cd_procedimento_sus, :cd_prestador, :cd_ori_ate, :cd_ser_dis,
            :cd_tip_mar, :cd_convenio, :cd_con_plan, :cd_sub_plano, :ds_acesso,
            :cd_cid, :cd_cbo_prestador, :cd_loc_proced, :cd_tipo_internacao,
            :cd_especialid, :sn_atendimento_apac
        )
    """
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    
    try:
        with conn.cursor() as cursor:
            # Prepara os dados para inserção
            for key in insert_data:
                if insert_data.get(key) == '':
                    insert_data[key] = None
            
            # Etapa 1: Inserir o paciente na turma
            print(f"-> A inserir paciente {insert_data.get('cd_paciente')} na tabela PACIENTE_TURMA_HEMO.")
            cursor.execute(sql, insert_data)
            print("-> Inserção realizada com sucesso.")

            # Etapa 2: Chamar a procedure de criação de agenda
            codigo_paciente = insert_data.get('cd_paciente')
            if not codigo_paciente:
                raise Exception("Código do paciente não foi fornecido para iniciar a agenda.")

            print(f"-> A chamar a rotina de agenda para o paciente: {codigo_paciente}")
            agenda_success, agenda_message = _disparar_rotina_agenda(cursor, int(codigo_paciente))
            
            # Etapa 3: Verificar o resultado e finalizar a transação
            if not agenda_success:
                # Se a procedure falhar, desfaz a inserção
                print("!!! Falha ao executar a procedure. A reverter a transação. !!!")
                conn.rollback()
                return jsonify({"error": agenda_message}), 400

            # Se tudo correu bem, confirma a transação
            conn.commit()
            print("-> Transação confirmada com sucesso (Inserção + Procedure).")
            return jsonify({
                "success": True, 
                "message": "Paciente adicionado e agenda iniciada com sucesso!"
            }), 201

    except oracledb.Error as e:
        print(f"!!! Erro de Oracle DB: {e} !!!")
        conn.rollback()
        return jsonify({"error": f"Erro ao inserir no banco: {e}"}), 500
    except Exception as e:
        print(f"!!! Erro inesperado na função add_paciente: {e} !!!")
        conn.rollback()
        return jsonify({"error": f"Ocorreu um erro inesperado: {e}"}), 500
    finally:
        if conn: conn.close()
        
@bp.route('/api/pacientes/<int:codigo>', methods=['PUT'])
@admin_required
def update_paciente(codigo):
    data = request.get_json(silent=True) or {}
    
    valid_columns = [
        'cd_turma', 'dt_inicio_vigencia', 'dt_fim_vigencia', 'sn_ativo',
        'cd_procedimento', 'cd_procedimento_sus', 'cd_prestador', 'cd_ori_ate',
        'cd_ser_dis', 'cd_tip_mar', 'cd_convenio', 'cd_con_plan', 'cd_sub_plano',
        'ds_acesso', 'cd_cid', 'cd_cbo_prestador', 'cd_loc_proced', 'cd_tipo_internacao',
        'cd_especialid', 'sn_atendimento_apac'
    ]

    update_data = {}
    for col in valid_columns:
        update_data[col] = data.get(col, None)

    update_data['cd_paciente'] = codigo

    for key, value in update_data.items():
        if isinstance(value, str):
            update_data[key] = value.upper()

    sql = """
        UPDATE PACIENTE_TURMA_HEMO SET
            cd_turma = :cd_turma,
            dt_inicio_vigencia = TO_DATE(:dt_inicio_vigencia, 'YYYY-MM-DD'),
            dt_fim_vigencia = TO_DATE(:dt_fim_vigencia, 'YYYY-MM-DD'),
            sn_ativo = :sn_ativo,
            cd_procedimento = :cd_procedimento,
            cd_procedimento_sus = :cd_procedimento_sus,
            cd_prestador = :cd_prestador,
            cd_ori_ate = :cd_ori_ate,
            cd_ser_dis = :cd_ser_dis,
            cd_tip_mar = :cd_tip_mar,
            cd_convenio = :cd_convenio,
            cd_con_plan = :cd_con_plan,
            cd_sub_plano = :cd_sub_plano,
            ds_acesso = :ds_acesso,
            cd_cid = :cd_cid,
            cd_cbo_prestador = :cd_cbo_prestador,
            cd_loc_proced = :cd_loc_proced,
            cd_tipo_internacao = :cd_tipo_internacao,
            cd_especialid = :cd_especialid,
            sn_atendimento_apac = :sn_atendimento_apac
        WHERE cd_paciente = :cd_paciente
    """
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    try:
        with conn.cursor() as cursor:
            for key in update_data:
                if update_data[key] == '':
                    update_data[key] = None
            
            cursor.execute(sql, update_data)
            conn.commit()
            return jsonify({"success": True, "message": "Paciente atualizado com sucesso!"}), 200
    except oracledb.Error as e:
        print(f"Erro ao atualizar: {e}")
        conn.rollback()
        return jsonify({"error": f"Erro ao atualizar no banco: {e}"}), 500
    finally:
        if conn: conn.close()

@bp.route('/api/pacientes/<int:codigo>', methods=['DELETE'])
@admin_required
def delete_paciente(codigo):
    sql = "DELETE FROM PACIENTE_TURMA_HEMO WHERE cd_paciente = :1"
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão"}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, [codigo])
            conn.commit()
            
            if cursor.rowcount > 0:
                return jsonify({"success": True, "message": "Paciente excluído com sucesso!"}), 200
            else:
                return jsonify({"error": "Nenhum paciente encontrado com este código para excluir."}), 404

    except oracledb.Error as e:
        print(f"Erro ao excluir: {e}")
        conn.rollback()
        return jsonify({"error": f"Erro ao excluir no banco: {e}"}), 500
    finally:
        if conn:
            conn.close()

# --- ROTA ON-DEMAND QUE AGORA USA A FUNÇÃO AUXILIAR ---
@bp.route('/api/pacientes/<int:codigo_paciente>/iniciar-agenda', methods=['POST'])
@admin_required
def iniciar_agenda_paciente(codigo_paciente):
    """
    Endpoint para chamar a procedure de forma avulsa (on-demand).
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados"}), 500
        
    try:
        with conn.cursor() as cursor:
            success, message = _disparar_rotina_agenda(cursor, codigo_paciente)
            
            if success:
                conn.commit()
                return jsonify({"message": f"Processo de criação de agenda iniciado com sucesso para o paciente {codigo_paciente}."}), 200
            else:
                conn.rollback()
                return jsonify({"error": message}), 400
 
    except Exception as e:
        # A função _disparar_rotina_agenda já trata os erros de DB e outros.
        # Este bloco é uma segurança adicional.
        print(f"!!! Erro inesperado na rota iniciar_agenda_paciente: {e} !!!")
        return jsonify({"error": f"Um erro inesperado ocorreu."}), 500
    finally:
        if conn:
            conn.close()

