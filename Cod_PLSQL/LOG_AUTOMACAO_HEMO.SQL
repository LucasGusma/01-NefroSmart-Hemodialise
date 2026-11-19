-- Create table
create table LOG_AUTOMACAO_HEMO
(
  id_log       NUMBER(10) not null,
  dt_log       DATE default SYSDATE not null,
  nm_procedure VARCHAR2(100),
  tp_mensagem  VARCHAR2(10),
  cd_paciente  NUMBER(10),
  ds_mensagem  VARCHAR2(2000)
)
tablespace MV2000_D
  pctfree 10
  initrans 1
  maxtrans 255
  storage
  (
    initial 64K
    next 1M
    minextents 1
    maxextents unlimited
  );
-- Add comments to the table 
comment on table LOG_AUTOMACAO_HEMO
  is 'Tabela de log para registrar as execuções das automações da hemodiálise.';
-- Add comments to the columns 
comment on column LOG_AUTOMACAO_HEMO.id_log
  is 'Chave primária da tabela de log.';
comment on column LOG_AUTOMACAO_HEMO.dt_log
  is 'Data e hora (formato DATE) em que o registro de log foi gerado.';
comment on column LOG_AUTOMACAO_HEMO.nm_procedure
  is 'Nome da procedure que gerou o log.';
comment on column LOG_AUTOMACAO_HEMO.tp_mensagem
  is 'Tipo da mensagem (INFO, ERRO, AVISO).';
comment on column LOG_AUTOMACAO_HEMO.cd_paciente
  is 'Código do paciente que estava sendo processado (se aplicável).';
comment on column LOG_AUTOMACAO_HEMO.ds_mensagem
  is 'A mensagem de log detalhada.';
-- Create/Recreate primary, unique and foreign key constraints 
alter table LOG_AUTOMACAO_HEMO
  add constraint PK_LOG_AUTOMACAO_HEMO primary key (ID_LOG)
  using index 
  tablespace MV2000_D
  pctfree 10
  initrans 2
  maxtrans 255
  storage
  (
    initial 64K
    next 1M
    minextents 1
    maxextents unlimited
  );
