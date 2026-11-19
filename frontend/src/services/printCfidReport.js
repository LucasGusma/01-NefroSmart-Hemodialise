import { formatDateBR, MESES_EXTENSO } from './schedule';
import { getProfessionalSignatures } from './professionalSignatureService';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

/**
 * Estilos CSS unificados para impressão de alta fidelidade em folha A4.
 */
const CFID_SHARED_STYLES = `
  @page {
    size: A4 portrait;
    margin: 8mm 10mm 8mm 10mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    color: #172d48;
    margin: 0;
    line-height: 1.25;
    background: #ffffff;
  }
  .cfid-page-wrapper {
    page-break-after: always;
    break-after: page;
    min-height: 275mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .cfid-page-wrapper:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .cfid-cover {
    page-break-after: always;
    break-after: page;
    min-height: 275mm;
  }
  .header {
    border: 1.5px solid #087b70;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 6px;
    background: #f6faf9;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #c2e2dc;
    padding-bottom: 4px;
    margin-bottom: 4px;
  }
  .sphere-tag {
    font-size: 7.2pt;
    font-weight: bold;
    color: #084b44;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .inst-title {
    font-size: 11pt;
    font-weight: bold;
    color: #087b70;
    text-transform: uppercase;
    margin: 0;
  }
  .inst-sub {
    font-size: 7.6pt;
    color: #334155;
    margin: 1px 0 0;
  }
  .doc-title {
    font-size: 10pt;
    font-weight: 900;
    color: #172d48;
    text-align: center;
    margin: 2px 0 1px;
    text-transform: uppercase;
  }
  .doc-sub {
    font-size: 7pt;
    color: #087b70;
    text-align: center;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .patient-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 6px;
    background: #ffffff;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 4px 12px;
    font-size: 7.8pt;
  }
  .patient-box strong {
    color: #087b70;
  }
  table.cfid-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
    font-size: 7.5pt;
  }
  table.cfid-table th {
    background-color: #087b70;
    color: #ffffff;
    border: 1px solid #065b53;
    padding: 3px 4px;
    font-weight: bold;
    text-align: center;
  }
  table.cfid-table td {
    border: 1px solid #cbd5e1;
    padding: 2.5px 4px;
    vertical-align: middle;
    text-align: center;
  }
  table.cfid-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .sig-cell {
    padding: 1px !important;
    width: 135px;
    height: 38px;
  }
  .sig-img {
    max-height: 34px;
    max-width: 130px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  .sig-sub {
    font-size: 6.2pt;
    color: #64748b;
    margin-top: 1px;
    display: block;
  }
  .badge-novo {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: bold;
    font-size: 6.8pt;
    display: inline-block;
  }
  .badge-reuso {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 6.8pt;
    display: inline-block;
  }
  .summary-box {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 4px 10px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 7.8pt;
  }
  .rt-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 5px 12px;
    margin-bottom: 5px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    font-size: 7.5pt;
  }
  .rt-box-triple {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 12px;
    margin-bottom: 6px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    font-size: 7.2pt;
  }
  .rt-line {
    border-top: 1px solid #172d48;
    margin-top: 24px;
    padding-top: 3px;
    text-align: center;
    font-weight: bold;
  }
  .rt-sig-img {
    max-height: 46px;
    max-width: 210px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  .rt-sig-audit {
    font-size: 6.2pt;
    color: #087b70;
    font-weight: bold;
    display: block;
    margin-top: 1px;
    line-height: 1.15;
  }
  .legal-footer {
    border-top: 1px solid #cbd5e1;
    padding-top: 4px;
    font-size: 6.6pt;
    color: #64748b;
    text-align: justify;
    line-height: 1.22;
  }
  .cover-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 10px 0;
  }
  .cover-kpi-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
    background: #f8fafc;
    text-align: center;
  }
  .cover-kpi-num {
    font-size: 16pt;
    font-weight: 900;
    color: #087b70;
  }
  .cover-kpi-label {
    font-size: 7.2pt;
    color: #475569;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 2px;
  }
`;

/**
 * Renderiza o corpo do CFID de um paciente (usado tanto no relatório avulso quanto no lote consolidado).
 */
export function renderPatientCfidHtml(paciente, mesAno, registros = [], pageInfo = null) {
  const [ano, mes] = (mesAno || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const nomeMes = MESES_EXTENSO[(mes || 1) - 1] || '';
  const totalSessoes = registros.length;
  const totalDialisadorNovo = registros.filter((r) => r.sn_dialisador_novo === 'S').length;

  const { medico: medicoSig, enfermeiro: enfermeiroSig } = getProfessionalSignatures(mesAno, paciente?.cd_paciente);

  // Ordena cronologicamente por data
  const sessoesOrdenadas = [...registros].sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const pageBadge = pageInfo
    ? `<div style="text-align: right; font-size: 7.2pt; color: #087b70; font-weight: bold;">
         Dossiê Consolidado • Folha ${pageInfo.current} de ${pageInfo.total}
       </div>`
    : '';

  return `
    <div class="cfid-page-wrapper">
      <div>
        <!-- Topo Institucional: Federal, Estadual (Minas Gerais) e Municipal (Belo Horizonte) -->
        <header class="header">
          <div class="header-top">
            <div>
              <div class="sphere-tag">
                Prefeitura de Belo Horizonte • Secretaria Municipal de Saúde (SMSA-BH / SUS-BH) • SES-MG
              </div>
              <h1 class="inst-title">Instituição de Saúde Modelo — Hospital de Referência Modelo</h1>
              <p class="inst-sub">Unidade de Nefrologia e Hemodiálise • Terapia Renal Substitutiva (TRS) • CNES: 2151609 • Belo Horizonte / MG</p>
            </div>
            <div style="text-align: right; font-size: 7.3pt; color: #475569;">
              ${pageBadge}
              <strong>SUS / APAC — Gestão Plena BH</strong><br>
              Procedimento: 03.05.01.010-7<br>
              Emissão: ${escapeHtml(new Date().toLocaleString('pt-BR'))}
            </div>
          </div>
          <div class="doc-title">Controle de Frequência Individual de Tratamento Dialítico (CFID)</div>
          <div class="doc-sub">Comprovação Ambulatorial de Hemodiálise (Portaria SAS/MS nº 706/2014, RDC Anvisa nº 11/2014, Lei Estadual MG nº 13.317/1999 e SMSA-BH)</div>
        </header>

        <!-- Dados do Paciente e Procedimento -->
        <section class="patient-box">
          <div>
            <span>Nome do Paciente:</span> <strong>${escapeHtml(paciente?.nome_paciente || 'Paciente')}</strong>
          </div>
          <div>
            <span>Prontuário / Cód. MV:</span> <strong>${escapeHtml(paciente?.cd_paciente || '-')}</strong>
          </div>
          <div>
            <span>Competência Faturamento:</span> <strong>${escapeHtml(nomeMes)} / ${escapeHtml(ano)}</strong>
          </div>
          <div>
            <span>Convênio / Regulação:</span> <strong>${escapeHtml(paciente?.nome_convenio || 'SUS — Belo Horizonte / APAC')}</strong>
          </div>
          <div>
            <span>Turno Habitual:</span> <strong>${escapeHtml(paciente?.nome_turma || '1º Turno (Manhã)')}</strong>
          </div>
          <div>
            <span>Procedimento SIA/SUS:</span> <strong>03.05.01.010-7 (TRS)</strong>
          </div>
        </section>

        <!-- Tabela do CFID com todas as sessões do mês -->
        <table class="cfid-table">
          <thead>
            <tr>
              <th style="width: 25px;">Nº</th>
              <th style="width: 68px;">Data</th>
              <th style="width: 82px;">Horário</th>
              <th style="width: 65px;">Acesso</th>
              <th style="width: 125px;">Dialisador (RDC 11/14)</th>
              <th>Intercorrências</th>
              <th style="width: 140px;">Assinatura do Paciente / Resp.</th>
              <th style="width: 78px;">Registro</th>
            </tr>
          </thead>
          <tbody>
            ${sessoesOrdenadas.length === 0 ? `
              <tr>
                <td colspan="8" style="padding: 16px; color: #64748b; font-style: italic;">
                  Nenhuma sessão registrada com assinatura nesta competência no banco de dados.
                </td>
              </tr>
            ` : sessoesOrdenadas.map((s, idx) => {
              const isNovo = s.sn_dialisador_novo === 'S';
              const dtPrimUsoTxt = s.dt_primeiro_uso_dialisador
                ? `<div style="font-size: 6pt; color: #0f766e;">1º Uso: ${escapeHtml(formatDateBR(s.dt_primeiro_uso_dialisador))}</div>`
                : (isNovo ? `<div style="font-size: 6pt; color: #0f766e;">1º Uso: ${escapeHtml(formatDateBR(s.data))}</div>` : '');
              const dialisadorText = isNovo
                ? `<span class="badge-novo">✨ NOVO (Lote: ${escapeHtml(s.lote_dialisador || 'S/L')})</span>${dtPrimUsoTxt}`
                : `<span class="badge-reuso">Reúso nº ${escapeHtml(s.num_reuso || '1')}</span>${dtPrimUsoTxt}`;
              
              const isResp = s.tipo_assinante === 'RESPONSAVEL';
              const sigSub = isResp
                ? `Resp (a rogo): ${escapeHtml(s.nome_responsavel || 'Responsável')}${s.motivo_responsavel ? ` • ${escapeHtml(s.motivo_responsavel)}` : ''}`
                : 'O Próprio Paciente';

              const imgSig = /^data:image\/(?:png|jpeg);base64,[a-z0-9+/=\s]+$/i.test(s.assinatura_base64 || '')
                ? `<img src="${escapeHtml(s.assinatura_base64)}" alt="Assinatura" class="sig-img" />`
                : `<span style="color: #94a3b8; font-size: 7pt;">Assinatura eletrônica</span>`;

              const hrExibicao = (s.hora_inicio && s.hora_fim)
                ? `${escapeHtml(s.hora_inicio)} às ${escapeHtml(s.hora_fim)}`
                : escapeHtml(s.hora_registro || '-');

              return `<tr>
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(formatDateBR(s.data))}</strong></td>
                <td>${hrExibicao}</td>
                <td>${escapeHtml(s.tipo_acesso || 'FAV')}</td>
                <td>${dialisadorText}</td>
                <td>${escapeHtml(s.intercorrencias === 'SEM_INTERCORRENCIAS' ? 'Sem intercorrências' : (s.intercorrencias || 'Sem intercorrências'))}</td>
                <td class="sig-cell">
                  ${imgSig}
                  <span class="sig-sub">${sigSub}</span>
                </td>
                <td style="font-size: 6.8pt;">
                  ${escapeHtml(s.hora_registro || '')}<br>
                  <span style="color: #64748b;">${escapeHtml(s.usuario_registro || 'SISTEMA')}</span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <!-- Quadro Resumo -->
        <div class="summary-box">
          <div><strong>Total de Sessões Faturáveis Realizadas no Mês:</strong> ${totalSessoes}</div>
          <div><strong>Dialisadores Novos Abertos (RDC 11/2014):</strong> ${totalDialisadorNovo}</div>
          <div><strong>Chave de Integridade Criptográfica:</strong> SHA-256 Registrada</div>
        </div>
      </div>

      <div>
        <!-- Assinatura dos Responsáveis Técnicos Locais (CRM-MG e COREN-MG) -->
        <section class="rt-box">
          <div>
            ${medicoSig?.imagem ? `<div style="height: 48px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 3px;"><img src="${medicoSig.imagem}" alt="Assinatura Médico RT" class="rt-sig-img" /></div>` : '<div style="height: 48px;"></div>'}
            <div class="rt-line" style="margin-top: 2px;">
              ${medicoSig ? `<strong>${escapeHtml(medicoSig.nome)}</strong><br>` : ''}
              Médico Nefrologista / Responsável Técnico da Unidade de TRS<br>
              <span style="font-size: 7.2pt; font-weight: normal; color: #475569;">
                ${medicoSig?.registro ? escapeHtml(medicoSig.registro) : 'CRM-MG / Carimbo'}
              </span>
              ${medicoSig?.dataHora ? `<span class="rt-sig-audit">✓ Assinado digitalmente em ${escapeHtml(medicoSig.dataHora)} • SHA-256: ${escapeHtml((medicoSig.hash || '').slice(0, 16))}...</span>` : ''}
            </div>
          </div>
          <div>
            ${enfermeiroSig?.imagem ? `<div style="height: 48px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 3px;"><img src="${enfermeiroSig.imagem}" alt="Assinatura Enfermeiro(a) RT" class="rt-sig-img" /></div>` : '<div style="height: 48px;"></div>'}
            <div class="rt-line" style="margin-top: 2px;">
              ${enfermeiroSig ? `<strong>${escapeHtml(enfermeiroSig.nome)}</strong><br>` : ''}
              Enfermeiro(a) Responsável Técnico(a) da Hemodiálise<br>
              <span style="font-size: 7.2pt; font-weight: normal; color: #475569;">
                ${enfermeiroSig?.registro ? escapeHtml(enfermeiroSig.registro) : 'COREN-MG / Carimbo'}
              </span>
              ${enfermeiroSig?.dataHora ? `<span class="rt-sig-audit">✓ Assinado digitalmente em ${escapeHtml(enfermeiroSig.dataHora)} • SHA-256: ${escapeHtml((enfermeiroSig.hash || '').slice(0, 16))}...</span>` : ''}
            </div>
          </div>
        </section>

        <!-- Rodapé Legal Completo: Federal, Minas Gerais e Belo Horizonte -->
        <footer class="legal-footer">
          <strong>Embasamento Legal e Normativo (Federal, Estadual de Minas Gerais e Municipal de Belo Horizonte):</strong>
          Documento oficial emitido nos termos da <strong>Portaria SAS/MS nº 706/2014</strong> (Controle de Frequência Individual de Tratamento Dialítico - CFID para faturamento e auditoria de APAC/TRS), <strong>RDC Anvisa nº 11/2014</strong> (Boas Práticas de Funcionamento dos Serviços de Diálise, registro de reúso e atesto de dialisador novo virgem), <strong>Código de Saúde de Minas Gerais (Lei Estadual nº 13.317/1999)</strong> e diretrizes sanitárias da <strong>SES-MG</strong>, <strong>Código Sanitário do Município de Belo Horizonte (Lei Municipal nº 7.031/1996)</strong> e normas de controle e auditoria do <strong>SUS Belo Horizonte (SMSA-BH / Gerência de Regulação e Auditoria Assistencial)</strong>, <strong>Lei Federal nº 14.063/2020</strong> (Assinaturas e documentos eletrônicos na saúde com integridade SHA-256), <strong>Lei Federal nº 13.787/2018</strong> e <strong>Pareceres do CRM-MG</strong> (Inviolabilidade, fidedignidade e guarda permanente de prontuários eletrônicos).
        </footer>
      </div>
    </div>
  `;
}

/**
 * Constrói o HTML oficial do documento CFID individual de um paciente.
 */
export function buildCfidReport(paciente, mesAno, registros = []) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CFID — ${escapeHtml(paciente?.nome_paciente || 'Paciente')} — ${escapeHtml(mesAno)} — SUS Belo Horizonte / MG</title>
  <style>
    ${CFID_SHARED_STYLES}
  </style>
</head>
<body>
  ${renderPatientCfidHtml(paciente, mesAno, registros)}
</body>
</html>`;
}

/**
 * Renderiza a Capa / Folha de Fechamento Consolidada do Lote Mensal (Dossiê para SMSA-BH e Auditoria).
 */
export function renderBatchCoverHtml(pacientesComRegistros, mesAno, options = {}) {
  const [ano, mes] = (mesAno || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const nomeMes = MESES_EXTENSO[(mes || 1) - 1] || '';
  
  const { medico: medicoSig, enfermeiro: enfermeiroSig } = getProfessionalSignatures(mesAno, null);

  const totalPacientes = pacientesComRegistros.length;
  const pacientesComSessao = pacientesComRegistros.filter((item) => (item.registros || []).length > 0);
  const totalSessoesGeral = pacientesComRegistros.reduce((acc, curr) => acc + (curr.registros || []).length, 0);
  const totalDialisadoresNovosGeral = pacientesComRegistros.reduce((acc, curr) => {
    return acc + (curr.registros || []).filter((r) => r.sn_dialisador_novo === 'S').length;
  }, 0);

  return `
    <div class="cfid-cover">
      <!-- Topo Institucional -->
      <header class="header">
        <div class="header-top">
          <div>
            <div class="sphere-tag">
              Prefeitura de Belo Horizonte • Secretaria Municipal de Saúde (SMSA-BH / SUS-BH) • SES-MG
            </div>
            <h1 class="inst-title">Instituição de Saúde Modelo — Hospital de Referência Modelo</h1>
            <p class="inst-sub">Unidade de Nefrologia e Hemodiálise • Terapia Renal Substitutiva (TRS) • CNES: 2151609 • Belo Horizonte / MG</p>
          </div>
          <div style="text-align: right; font-size: 7.5pt; color: #475569;">
            <strong>FECHAMENTO MENSAL APAC TRS</strong><br>
            Competência: ${escapeHtml(nomeMes)} / ${escapeHtml(ano)}<br>
            Emissão: ${escapeHtml(new Date().toLocaleString('pt-BR'))}
          </div>
        </div>
        <div class="doc-title" style="font-size: 11.5pt;">DOSSIÊ DE FECHAMENTO MENSAL DE SESSÕES — CFID GERAL CONSOLIDADO</div>
        <div class="doc-sub">Comprovação Coletiva de Frequência para Faturamento e Auditoria SUS / APAC (Portaria SAS/MS nº 706/2014 & SMSA-BH)</div>
      </header>

      <!-- Painel de Indicadores da Competência -->
      <div class="cover-kpi-grid">
        <div class="cover-kpi-card">
          <div class="cover-kpi-num">${totalPacientes}</div>
          <div class="cover-kpi-label">Pacientes no Lote</div>
        </div>
        <div class="cover-kpi-card">
          <div class="cover-kpi-num">${pacientesComSessao.length}</div>
          <div class="cover-kpi-label">Pacientes com Atendimento</div>
        </div>
        <div class="cover-kpi-card">
          <div class="cover-kpi-num">${totalSessoesGeral}</div>
          <div class="cover-kpi-label">Total Sessões Realizadas</div>
        </div>
        <div class="cover-kpi-card">
          <div class="cover-kpi-num">${totalDialisadoresNovosGeral}</div>
          <div class="cover-kpi-label">Dialisadores Novos (RDC 11)</div>
        </div>
      </div>

      <!-- Resumo Analítico por Paciente -->
      <div style="margin-bottom: 8px;">
        <div style="font-size: 8.2pt; font-weight: bold; color: #087b70; margin-bottom: 4px; text-transform: uppercase;">
          Relação de Pacientes e Sessões da Competência (${escapeHtml(nomeMes)} / ${escapeHtml(ano)}):
        </div>
        <table class="cfid-table" style="font-size: 7.2pt;">
          <thead>
            <tr>
              <th style="width: 25px;">Nº</th>
              <th style="width: 60px;">Cód. MV</th>
              <th>Nome do Paciente</th>
              <th style="width: 140px;">Turno / Turma</th>
              <th style="width: 75px;">Sessões Realizadas</th>
              <th style="width: 80px;">Dialisador Novo</th>
              <th style="width: 110px;">Status Assinaturas</th>
            </tr>
          </thead>
          <tbody>
            ${pacientesComRegistros.map((item, idx) => {
              const p = item.paciente;
              const regs = item.registros || [];
              const novos = regs.filter((r) => r.sn_dialisador_novo === 'S').length;
              return `<tr>
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(p?.cd_paciente || '-')}</strong></td>
                <td style="text-align: left; padding-left: 6px;"><strong>${escapeHtml(p?.nome_paciente || 'Paciente')}</strong></td>
                <td>${escapeHtml(p?.nome_turma || '1º Turno')}</td>
                <td><strong>${regs.length}</strong></td>
                <td>${novos > 0 ? `<span class="badge-novo">${novos} novo(s)</span>` : '<span style="color: #64748b;">Apenas reúso</span>'}</td>
                <td><span style="color: #15803d; font-weight: bold;">✓ 100% Coletadas</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Termo Formal de Atesto e Fechamento de Competência -->
      <div style="border: 1px solid #cbd5e1; background: #fdfdfd; padding: 7px 10px; border-radius: 6px; font-size: 7.2pt; line-height: 1.3; text-align: justify; margin-bottom: 8px;">
        <strong>TERMO DE ENCERRAMENTO E ATESTO DE SESSÕES DIALÍTICAS (PORTARIA SAS/MS Nº 706/2014 & SMSA-BH):</strong><br>
        Atestamos perante a <strong>Secretaria Municipal de Saúde de Belo Horizonte (SMSA-BH / Gerência de Regulação e Auditoria do SUS-BH)</strong>, a <strong>Secretaria de Estado de Saúde de Minas Gerais (SES-MG)</strong> e o <strong>Sistema Nacional de Auditoria (SNA)</strong> que os procedimentos ambulatoriais de Hemodiálise (Código SIA/SUS 03.05.01.010-7) discriminados neste lote mensal foram efetivamente realizados na Unidade de TRS da Instituição de Saúde Modelo • Hospital de Referência Modelo na competência indicada. Cada sessão conta com confirmação individualizada de comparecimento do paciente ou seu responsável legal, registro de horários, intercorrências e estrito controle sanitário de primeiro uso e reutilização de dialisadores conforme preceitua a RDC Anvisa nº 11/2014 e a Lei Estadual nº 13.317/1999 (Código de Saúde de Minas Gerais). As assinaturas eletrônicas foram capturadas sob garantia de autoria e integridade criptográfica SHA-256 (Lei Federal nº 14.063/2020), encontrando-se as folhas individuais apensas a este dossiê.
      </div>

      <!-- Assinaturas Formais Triplas -->
      <section class="rt-box-triple">
        <div>
          ${medicoSig?.imagem ? `<div style="height: 42px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 2px;"><img src="${medicoSig.imagem}" alt="Assinatura Médico RT" class="rt-sig-img" style="max-height: 40px;" /></div>` : '<div style="height: 42px;"></div>'}
          <div class="rt-line" style="margin-top: 2px;">
            ${medicoSig ? `<strong>${escapeHtml(medicoSig.nome)}</strong><br>` : ''}
            Médico Nefrologista / RT da Unidade<br>
            <span style="font-size: 7pt; font-weight: normal; color: #475569;">
              ${medicoSig?.registro ? escapeHtml(medicoSig.registro) : 'CRM-MG / Carimbo'}
            </span>
            ${medicoSig?.dataHora ? `<span class="rt-sig-audit">✓ Assinado em ${escapeHtml(medicoSig.dataHora)}</span>` : ''}
          </div>
        </div>
        <div>
          ${enfermeiroSig?.imagem ? `<div style="height: 42px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 2px;"><img src="${enfermeiroSig.imagem}" alt="Assinatura Enfermeiro(a) RT" class="rt-sig-img" style="max-height: 40px;" /></div>` : '<div style="height: 42px;"></div>'}
          <div class="rt-line" style="margin-top: 2px;">
            ${enfermeiroSig ? `<strong>${escapeHtml(enfermeiroSig.nome)}</strong><br>` : ''}
            Enfermeiro(a) Responsável Técnico(a)<br>
            <span style="font-size: 7pt; font-weight: normal; color: #475569;">
              ${enfermeiroSig?.registro ? escapeHtml(enfermeiroSig.registro) : 'COREN-MG / Carimbo'}
            </span>
            ${enfermeiroSig?.dataHora ? `<span class="rt-sig-audit">✓ Assinado em ${escapeHtml(enfermeiroSig.dataHora)}</span>` : ''}
          </div>
        </div>
        <div>
          <div style="height: 42px;"></div>
          <div class="rt-line" style="margin-top: 2px;">
            Faturamento SUS / Gestão de APAC<br>
            <span style="font-size: 7pt; font-weight: normal; color: #475569;">Hospital de Referência Modelo / Assinatura</span>
          </div>
        </div>
      </section>

      <!-- Rodapé Legal -->
      <footer class="legal-footer">
        Dossiê de fechamento emitido pelo sistema NefroSmart em conformidade com a Portaria SAS/MS nº 706/2014, RDC Anvisa nº 11/2014, Código Sanitário de Belo Horizonte (Lei Municipal nº 7.031/1996), Código de Saúde de Minas Gerais (Lei Estadual nº 13.317/1999), Lei Federal nº 14.063/2020 e Lei Federal nº 13.787/2018 (guarda permanente de prontuários eletrônicos).
      </footer>
    </div>
  `;
}

/**
 * Constrói o HTML completo do lote consolidado (Capa + Folha individual de cada paciente).
 */
export function buildBatchCfidReport(pacientesComRegistros, mesAno, options = {}) {
  const [ano, mes] = (mesAno || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const nomeMes = MESES_EXTENSO[(mes || 1) - 1] || '';
  const total = pacientesComRegistros.length;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CFID Geral Consolidado — Competência ${escapeHtml(nomeMes)} / ${escapeHtml(ano)} — Hospital de Referência Modelo • SMSA-BH</title>
  <style>
    ${CFID_SHARED_STYLES}
  </style>
</head>
<body>
  <!-- Capa de Fechamento do Lote -->
  ${renderBatchCoverHtml(pacientesComRegistros, mesAno, options)}

  <!-- Folhas Individuais de Cada Paciente -->
  ${pacientesComRegistros.map((item, idx) => {
    return renderPatientCfidHtml(item.paciente, mesAno, item.registros || [], {
      current: idx + 1,
      total,
    });
  }).join('')}
</body>
</html>`;
}

/**
 * Dispara a impressão do documento CFID individual em folha A4.
 */
export async function printCfidReport(paciente, mesAno, registros = []) {
  const frame = document.createElement('iframe');
  frame.title = 'Impressão do CFID — Portaria SAS/MS nº 706/2014 — Belo Horizonte / MG';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:850px;height:700px;border:0';
  document.body.appendChild(frame);

  let cleanupTimer;
  const cleanup = () => {
    clearTimeout(cleanupTimer);
    try {
      frame.remove();
    } catch (e) {}
  };

  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(buildCfidReport(paciente, mesAno, registros));
    doc.close();

    await Promise.all(
      Array.from(doc.images, (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 3000);
        })
      )
    );

    frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
    cleanupTimer = setTimeout(cleanup, 300000);
    frame.contentWindow.focus();
    frame.contentWindow.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}

/**
 * Dispara a impressão consolidada em lote de todos os CFIDs do mês.
 */
export async function printBatchCfidReport(pacientesComRegistros, mesAno, options = {}) {
  const frame = document.createElement('iframe');
  frame.title = 'Impressão Consolidada do CFID — Fechamento Mensal APAC — SMSA-BH';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:850px;height:700px;border:0';
  document.body.appendChild(frame);

  let cleanupTimer;
  const cleanup = () => {
    clearTimeout(cleanupTimer);
    try {
      frame.remove();
    } catch (e) {}
  };

  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(buildBatchCfidReport(pacientesComRegistros, mesAno, options));
    doc.close();

    await Promise.all(
      Array.from(doc.images, (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 4000);
        })
      )
    );

    frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
    cleanupTimer = setTimeout(cleanup, 600000);
    frame.contentWindow.focus();
    frame.contentWindow.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
