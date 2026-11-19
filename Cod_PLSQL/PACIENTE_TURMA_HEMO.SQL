-- Create table
create table PACIENTE_TURMA_HEMO
(
  cd_paciente         NUMBER(10) not null,
  cd_turma            NUMBER(10) not null,
  dt_inicio_vigencia  DATE not null,
  dt_fim_vigencia     DATE,
  sn_ativo            VARCHAR2(1) default 'S' not null,
  cd_procedimento     VARCHAR2(10),
  cd_procedimento_sus VARCHAR2(10),
  cd_prestador        NUMBER(6),
  cd_ori_ate          NUMBER(4),
  cd_ser_dis          NUMBER(4),
  cd_tip_mar          NUMBER(2),
  cd_convenio         NUMBER(4),
  cd_con_plan         NUMBER(4),
  cd_sub_plano        NUMBER(4),
  ds_acesso           VARCHAR2(200),
  cd_cid              VARCHAR2(10),
  cd_cbo_prestador    VARCHAR2(6),
  cd_loc_proced       NUMBER(4),
  cd_tipo_internacao  NUMBER(4),
  cd_especialid       NUMBER(4),
  sn_atendimento_apac VARCHAR2(1) default 'S'
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
comment on table PACIENTE_TURMA_HEMO
  is 'Tabela que associa um paciente a uma turma de hemodiálise, definindo sua vigência.';
-- Add comments to the columns 
comment on column PACIENTE_TURMA_HEMO.cd_paciente
  is 'FK para a tabela PACIENTE da MV.';
comment on column PACIENTE_TURMA_HEMO.cd_turma
  is 'FK para a tabela TURMA_HEMODIALISE.';
comment on column PACIENTE_TURMA_HEMO.dt_inicio_vigencia
  is 'Data em que o paciente iniciou nesta turma.';
comment on column PACIENTE_TURMA_HEMO.dt_fim_vigencia
  is 'Data em que o paciente foi desligado da turma (permite manter histórico).';
comment on column PACIENTE_TURMA_HEMO.sn_ativo
  is 'Status do vínculo do paciente na turma (S/N).';
comment on column PACIENTE_TURMA_HEMO.cd_procedimento
  is 'Procedimento Ambulatorial SUS a ser usado para a sessao do paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_procedimento_sus
  is 'Segundo Procedimento Ambulatorial SUS, se aplicável.';
comment on column PACIENTE_TURMA_HEMO.cd_prestador
  is 'Prestador padrao para o atendimento do paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_ori_ate
  is 'Origem de Atendimento padrao para o paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_ser_dis
  is 'Servico padrao para o paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_tip_mar
  is 'Tipo de Marcacao padrao para o paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_convenio
  is 'Convenio para o atendimento do paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_con_plan
  is 'Plano do convenio para o atendimento do paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_sub_plano
  is 'Sub-plano do convenio para o atendimento do paciente.';
comment on column PACIENTE_TURMA_HEMO.ds_acesso
  is 'Descricao do acesso vascular do paciente (Ex: Fistula, Cateter).';
comment on column PACIENTE_TURMA_HEMO.cd_cid
  is 'CID principal para o atendimento do paciente.';
comment on column PACIENTE_TURMA_HEMO.cd_cbo_prestador
  is 'CBO do prestador para o atendimento.';
comment on column PACIENTE_TURMA_HEMO.cd_loc_proced
  is 'Local do procedimento para o atendimento.';
comment on column PACIENTE_TURMA_HEMO.cd_tipo_internacao
  is 'Tipo de internacao para o atendimento.';
comment on column PACIENTE_TURMA_HEMO.cd_especialid
  is 'Especialidade para o atendimento.';
comment on column PACIENTE_TURMA_HEMO.sn_atendimento_apac
  is 'Indica se o atendimento e do tipo APAC (S/N).';
-- Create/Recreate primary, unique and foreign key constraints 
alter table PACIENTE_TURMA_HEMO
  add constraint PK_PACIENTE_TURMA_HEMO primary key (CD_PACIENTE)
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
alter table PACIENTE_TURMA_HEMO
  add constraint FK_PACTURMA_PACIENTE foreign key (CD_PACIENTE)
  references PACIENTE (CD_PACIENTE);
alter table PACIENTE_TURMA_HEMO
  add constraint FK_PACTURMA_TURMA foreign key (CD_TURMA)
  references TURMA_HEMODIALISE (CD_TURMA);
