DBMS_SCHEDULER.CREATE_JOB (
    job_name        => 'JOB_AGENDA_HEMO_MENSAL',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN PKG_AGENDA_HEMODIALISE.PRC_AUTOMATIZA_GERACAO_MENSAL; END;',
    start_date      => SYSTIMESTAMP,
    -- Agendado para todo dia 25, à 01:00 da manhã
    repeat_interval => 'FREQ=MONTHLY; BYMONTHDAY=25; BYHOUR=1; BYMINUTE=00;',
    enabled         => TRUE,
    comments        => 'Job que cria o atendimento-pai e gera as sessoes da hemodialise para todos os pacientes ativos no dia 25 de cada mes.'
  );

  DBMS_OUTPUT.PUT_LINE('JOB "JOB_AGENDA_HEMO_MENSAL" criado/recriado com sucesso!');

END;