import oracledb

def _disparar_rotina_agenda(cursor, codigo_paciente):
    """
    Lógica centralizada para chamar a procedure da agenda usando callproc(),
    que agora propaga erros via exceções do Oracle (RAISE_APPLICATION_ERROR).
    Recebe um cursor existente para operar dentro de uma transação.
    Retorna uma tupla (bool_sucesso, mensagem_de_erro_ou_sucesso).
    """
    try:
        print(f"-> A chamar a procedure PKG_AGENDA_HEMODIALISE.PRC_INICIA_AGENDA_PAC_NOVO via callproc() para o paciente: {codigo_paciente}")
        
        # Chama a procedure diretamente pelo nome, passando uma lista de parâmetros.
        # Se a procedure levantar um erro, a exceção será capturada abaixo.
        cursor.callproc("PKG_AGENDA_HEMODIALISE.PRC_INICIA_AGENDA_PAC_NOVO", [codigo_paciente])
        
        # Se a execução chegar aqui, a procedure não levantou exceção.
        print(f"-> Procedure de agenda executada com sucesso para o paciente {codigo_paciente}.")
        return True, f"Procedure de agenda executada com sucesso para o paciente {codigo_paciente}."

    except oracledb.Error as e:
        # Captura a exceção levantada pela procedure no banco de dados.
        error_obj = e.args[0]
        error_message = error_obj.message.strip()
        print(f"!!! Erro de banco de dados ao chamar a procedure: {error_message} !!!")
        # Retorna a mensagem de erro vinda diretamente do Oracle.
        return False, error_message
    except Exception as e:
        print(f"!!! Erro inesperado ao chamar a procedure: {e} !!!")
        return False, "Um erro inesperado ocorreu durante a chamada da procedure."


