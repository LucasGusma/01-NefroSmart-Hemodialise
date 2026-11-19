-- Create table
create table TURMA_HEMODIALISE
(
  cd_turma       NUMBER(10) not null,
  ds_turma       VARCHAR2(100) not null,
  tp_dias_semana VARCHAR2(3) not null,
  hr_atendimento VARCHAR2(5) not null
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
comment on table TURMA_HEMODIALISE
  is 'Tabela de cadastro das turmas fixas de hemodiálise (dias e horários).';
-- Add comments to the columns 
comment on column TURMA_HEMODIALISE.cd_turma
  is 'PK - Código sequencial da turma.';
comment on column TURMA_HEMODIALISE.ds_turma
  is 'Descrição amigável da turma (Ex: Hemo Seg/Qua/Sex - Manhã).';
comment on column TURMA_HEMODIALISE.tp_dias_semana
  is 'Tipo de agrupamento de dias: SQS (Seg/Qua/Sex) ou TQS (Ter/Qui/Sab).';
comment on column TURMA_HEMODIALISE.hr_atendimento
  is 'Horário de início do atendimento no formato HH24:MI (Ex: 09:00).';
-- Create/Recreate primary, unique and foreign key constraints 
alter table TURMA_HEMODIALISE
  add constraint PK_TURMA_HEMODIALISE primary key (CD_TURMA)
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
