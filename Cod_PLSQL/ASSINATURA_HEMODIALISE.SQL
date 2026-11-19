-- =============================================================================
-- TABELA DE ASSINATURA E CONTROLE DE FREQUÊNCIA INDIVIDUAL DE HEMODIÁLISE (CFID)
-- Sistema: NefroSmart / MV2000 — Instituição Hospitalar de Referência
-- CNES: 2151609 • Belo Horizonte / Minas Gerais
-- Finalidade: Guarda permanente (vitalícia) e comprovação ambulatorial para SUS / APAC
-- Embasamento Legal Federal, Estadual (MG) e Municipal (Belo Horizonte):
--   1. Portaria SAS/MS nº 706/2014 (CFID — Controle de Frequência Individual de Tratamento Dialítico)
--   2. Portaria GM/MS nº 1.675/2018 (Diretrizes de Cuidado da Pessoa com DRC e TRS no SUS)
--   3. RDC Anvisa nº 11/2014, Art. 27 a 35 e Parágrafo Único (Apresentação e assinatura de 1º uso de dialisador novo e controle de reúso)
--   4. Lei Federal nº 14.063/2020 e MP nº 2.200-2/2001 (Assinaturas Eletrônicas em Saúde e Integridade SHA-256)
--   5. Lei Federal nº 13.787/2018 e Resolução CFM nº 1.821/2007 / nº 2.299/2021 (Guarda permanente de Prontuário Eletrônico)
--   6. Lei Federal nº 13.709/2018 (LGPD — Art. 11, II, tutela da saúde e obrigação regulatória)
--   7. Lei Estadual MG nº 13.317/1999 (Código de Saúde do Estado de Minas Gerais — SES-MG / VISA-MG)
--   8. Lei Municipal BH nº 7.031/1996 (Código Sanitário de Belo Horizonte) e Normas de Auditoria Assistencial SMSA-BH / SUS-BH
-- =============================================================================

CREATE TABLE ASSINATURA_HEMODIALISE
(
  ID                    VARCHAR2(100) NOT NULL,
  CD_PACIENTE           NUMBER(10) NOT NULL,
  NM_PACIENTE           VARCHAR2(150),
  DT_SESSAO             DATE NOT NULL,
  CD_HORARIO            VARCHAR2(10) DEFAULT '1',
  DS_TURNO              VARCHAR2(60),
  TP_STATUS             VARCHAR2(20) DEFAULT 'COMPARECIDO' NOT NULL,
  SN_ASSINADO           VARCHAR2(1) DEFAULT 'S' NOT NULL,
  DS_ASSINATURA_BASE64  CLOB,
  HR_REGISTRO           VARCHAR2(10),
  NM_USUARIO            VARCHAR2(50),
  DS_OBSERVACAO         VARCHAR2(1000),
  -- Requisitos RDC Anvisa nº 11/2014 (Art. 35 e Parágrafo Único)
  SN_DIALISADOR_NOVO    VARCHAR2(1) DEFAULT 'N',
  DS_LOTE_DIALISADOR    VARCHAR2(50),
  DT_PRIMEIRO_USO_DIAL  VARCHAR2(20),
  NR_REUSO              NUMBER(4) DEFAULT 0,
  -- Requisitos Portaria SAS/MS nº 706/2014 e Art. 595 do Código Civil (Assinatura Paciente / Responsável Legal a rogo)
  TP_ASSINANTE          VARCHAR2(20) DEFAULT 'PACIENTE',
  NM_RESPONSAVEL        VARCHAR2(100),
  NR_DOC_RESPONSAVEL    VARCHAR2(30),
  DS_PARENTESCO         VARCHAR2(50),
  DS_MOTIVO_RESPONSAVEL VARCHAR2(120),
  -- Parâmetros Clínicos e Faturamento SIA/SUS APAC (Portaria GM/MS nº 1.675/2018 e SMSA-BH)
  HR_INICIO             VARCHAR2(10),
  HR_FIM                VARCHAR2(10),
  DS_TIPO_ACESSO        VARCHAR2(30) DEFAULT 'FAV',
  DS_INTERCORRENCIAS    VARCHAR2(250) DEFAULT 'SEM_INTERCORRENCIAS',
  CD_PROCEDIMENTO_SUS   VARCHAR2(20) DEFAULT '03.05.01.010-7',
  CD_CID                VARCHAR2(10) DEFAULT 'N18.0',
  -- Requisitos Lei Federal nº 14.063/2020 e LGPD (Lei nº 13.709/2018)
  SN_LGPD_CONSENTIMENTO VARCHAR2(1) DEFAULT 'S',
  DS_HASH_INTEGRIDADE   VARCHAR2(64),
  DT_CRIACAO            DATE DEFAULT SYSDATE NOT NULL,
  DT_ATUALIZACAO        DATE DEFAULT SYSDATE NOT NULL
)
TABLESPACE MV2000_D
  PCTFREE 10
  INITRANS 1
  MAXTRANS 255
  STORAGE
  (
    INITIAL 64K
    NEXT 1M
    MINEXTENTS 1
    MAXEXTENTS UNLIMITED
  );

-- Comentários Regulatórios da Tabela e Colunas
COMMENT ON TABLE ASSINATURA_HEMODIALISE
  IS 'Registro vitalício de comparecimento (CFID) e assinatura digital de sessões de hemodiálise (Portaria SAS/MS 706/2014, RDC Anvisa 11/2014 Art. 35, Lei 14.063/2020, Lei 13.787/2018 e SMSA-BH).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.ID
  IS 'Identificador único do registro (Composto: YYYY-MM-DD_TURNO_CDPACIENTE).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.SN_DIALISADOR_NOVO
  IS 'Indica abertura/primeiro uso de dialisador virgem na sessão (S/N) conforme Art. 35, Parágrafo Único da RDC Anvisa nº 11/2014.';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.DS_LOTE_DIALISADOR
  IS 'Número do lote do dialisador novo apresentado e assinado pelo paciente (RDC Anvisa nº 11/2014).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.DT_PRIMEIRO_USO_DIAL
  IS 'Data do primeiro uso do dialisador identificado (Art. 35, caput da RDC Anvisa nº 11/2014).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.NR_REUSO
  IS 'Número do reúso atual do dialisador (0 quando primeiro uso).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.TP_ASSINANTE
  IS 'Identificação do signatário: PACIENTE ou RESPONSAVEL (a rogo / representante legal conforme Art. 595 do Código Civil e Portaria SAS/MS 706/2014).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.DS_MOTIVO_RESPONSAVEL
  IS 'Justificativa legal quando assinado por responsável (ex: FAV no braço dominante imobilizado, limitação motora/visual, paciente não alfabetizado).';

COMMENT ON COLUMN ASSINATURA_HEMODIALISE.DS_HASH_INTEGRIDADE
  IS 'Hash criptográfico SHA-256 de integridade inviolável do registro e da assinatura (Lei Federal nº 14.063/2020).';

-- Chave Primária
ALTER TABLE ASSINATURA_HEMODIALISE
  ADD CONSTRAINT PK_ASSINATURA_HEMO PRIMARY KEY (ID)
  USING INDEX 
  TABLESPACE MV2000_D;

-- Índices de Performance para Consultas por Paciente, Data e Período Mensal
CREATE INDEX IDX_ASS_HEMO_PAC ON ASSINATURA_HEMODIALISE (CD_PACIENTE)
  TABLESPACE MV2000_D;

CREATE INDEX IDX_ASS_HEMO_DT ON ASSINATURA_HEMODIALISE (DT_SESSAO)
  TABLESPACE MV2000_D;

CREATE INDEX IDX_ASS_HEMO_STATUS ON ASSINATURA_HEMODIALISE (DT_SESSAO, TP_STATUS)
  TABLESPACE MV2000_D;
