DBMS_SCHEDULER.CREATE_JOB (
    job_name        => 'JOB_CRIA_FILHOS_HEMO_DIARIO',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN PKG_AGENDA_HEMODIALISE.PRC_CRIA_ATD_FILHO_SESSAO; END;',
    start_date      => SYSTIMESTAMP,
    -- Agendado para todo dia, à 01:30 da manhã
    repeat_interval => 'FREQ=DAILY; BYHOUR=1; BYMINUTE=30;',
    enabled         => TRUE,
    comments        => 'Job diario que cria os atendimentos-filhos para as sessoes de hemodialise agendadas para daqui a 5 dias.'
  );

  DBMS_OUTPUT.PUT_LINE('JOB "JOB_CRIA_FILHOS_HEMO_DIARIO" criado/recriado com sucesso!');

END;