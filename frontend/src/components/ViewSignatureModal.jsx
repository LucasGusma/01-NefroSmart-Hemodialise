import MonochromeIcon from './MonochromeIcon';
import React from 'react';
import Button from './Button';
import { formatDateBR, formatDateLongBR } from '../services/schedule';

const ViewSignatureModal = ({
  isOpen,
  registro,
  onClose,
  onDesmarcar,
  onColetarAssinatura,
}) => {
  if (!isOpen || !registro) return null;

  const compareceu = registro.status === 'COMPARECIDO' && Boolean(registro.assinatura_base64);
  const isNovo = registro.sn_dialisador_novo === 'S';
  const isResp = registro.tipo_assinante === 'RESPONSAVEL';
  const isMaster = Boolean(registro.isMaster);
  const dtPrimUso = registro.dt_primeiro_uso_dialisador
    ? formatDateBR(registro.dt_primeiro_uso_dialisador)
    : (isNovo ? formatDateBR(registro.data) : '');

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const safeNome = (registro.nome_paciente || 'Paciente').replace(/[^a-zA-Z0-9À-ÿ\s]/g, '');
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante_${safeNome.replace(/\s+/g, '_')}_${registro.data}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #172d48;
            background: #ffffff;
            padding: 6px;
          }
          .container {
            max-width: 720px;
            margin: 0 auto;
            border: 2px solid #34a99b;
            border-radius: 12px;
            overflow: hidden;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .header {
            background-color: #40baab;
            color: #172d48;
            padding: 16px 22px;
            border-bottom: 2px solid #34a99b;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #084b44;
          }
          .header-main {
            font-size: 17px;
            font-weight: 900;
            margin-top: 4px;
          }
          .content {
            padding: 18px 22px;
          }
          .patient-box {
            background-color: #f6faf9;
            border: 1px solid #d5e7e4;
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 14px;
          }
          .patient-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #d5e7e4;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .patient-name {
            font-size: 17px;
            font-weight: 800;
            color: #172d48;
          }
          .badge-presente {
            display: inline-block;
            background-color: #d5f1eb;
            color: #087b70;
            border: 1px solid #a1dbd2;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 800;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            font-size: 12px;
            margin-bottom: 10px;
          }
          .detail-label {
            font-size: 10px;
            color: #087b70;
            font-weight: 700;
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
          }
          .detail-val {
            font-weight: 700;
            color: #1e293b;
          }
          .regulatory-box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
            margin-top: 8px;
            font-size: 11px;
            line-height: 1.4;
          }
          .declaration {
            background-color: #e8f7f5;
            border-left: 4px solid #40baab;
            padding: 10px 14px;
            font-size: 11px;
            border-radius: 0 8px 8px 0;
            margin-top: 10px;
            color: #084b44;
            font-style: italic;
          }
          .signature-section {
            border: 2px dashed #40baab;
            border-radius: 10px;
            padding: 14px;
            text-align: center;
            background-color: #ffffff;
            margin-bottom: 14px;
          }
          .signature-label {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #087b70;
            margin-bottom: 8px;
            display: block;
            text-align: left;
          }
          .signature-img {
            max-height: 150px;
            max-width: 100%;
            object-fit: contain;
            margin: 0 auto 8px;
            display: block;
          }
          .signature-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            font-size: 11px;
            color: #64748b;
          }
          .legal-box {
            font-size: 9.5px;
            color: #64748b;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            border-radius: 8px;
            line-height: 1.35;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <div class="header-title">Instituição de Saúde Modelo • Hospital de Referência Modelo • CNES: 2151609 • Belo Horizonte / MG</div>
              <div class="header-main">Ficha Individual de Presença de Hemodiálise (CFID)</div>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <strong>SUS-BH / APAC TRS</strong><br />
              Portaria SAS/MS nº 706/2014 • SMSA-BH
            </div>
          </div>

          <div class="content">
            <div class="patient-box">
              <div class="patient-grid">
                <div>
                  <div class="patient-name">${safeNome}</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                    Prontuário MV: <strong>${registro.cd_paciente}</strong> • Procedimento SIA/SUS: <strong>${registro.cd_procedimento_sus || '03.05.01.010-7'}</strong> • CID-10: <strong>${registro.cd_cid || 'N18.0'}</strong>
                  </div>
                </div>
                <div class="badge-presente">
                  ✓ Comparecido
                </div>
              </div>

              <div class="details-grid">
                <div>
                  <span class="detail-label">Data da Sessão:</span>
                  <span class="detail-val">${formatDateBR(registro.data)}</span>
                </div>
                <div>
                  <span class="detail-label">Turno:</span>
                  <span class="detail-val">${registro.horario_desc || '1º Turno (Manhã)'}</span>
                </div>
                <div>
                  <span class="detail-label">Horário da Sessão:</span>
                  <span class="detail-val">${registro.hora_inicio || '-'} às ${registro.hora_fim || '-'}</span>
                </div>
                <div>
                  <span class="detail-label">Acesso Vascular:</span>
                  <span class="detail-val">${registro.tipo_acesso || 'FAV'}</span>
                </div>
                <div>
                  <span class="detail-label">Dialisador (Art. 35 RDC 11/14):</span>
                  <span class="detail-val">
                    ${isNovo ? `1º USO / NOVO (Lote: ${registro.lote_dialisador || 'S/L'})` : `Reúso nº ${registro.num_reuso || 1}`}${dtPrimUso ? ` • 1º Uso: ${dtPrimUso}` : ''}
                  </span>
                </div>
                <div>
                  <span class="detail-label">Intercorrências:</span>
                  <span class="detail-val">
                    ${registro.intercorrencias === 'SEM_INTERCORRENCIAS' ? 'Sem intercorrências' : (registro.intercorrencias || 'Sem intercorrências')}
                  </span>
                </div>
              </div>

              <div class="regulatory-box">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>Signatário:</strong> ${isResp ? `Responsável Legal (a rogo) — ${registro.nome_responsavel || ''} (${registro.parentesco_responsavel || 'Vínculo Legal'} • Doc: ${registro.doc_responsavel || 'Informado'})` : 'O Próprio Paciente'}
                  </div>
                  <div>
                    <strong>Operador MV:</strong> ${registro.usuario_registro || 'SISTEMA'}
                  </div>
                </div>
                ${isResp && registro.motivo_responsavel ? `<div style="margin-top: 4px; color: #475569;"><strong>Justificativa Legal (Art. 595 CC / Portaria 706/2014):</strong> ${registro.motivo_responsavel}</div>` : ''}
              </div>

              <div class="declaration">
                "${formatDateLongBR(registro.data)}: Sessão de hemodiálise realizada e confirmada sob os preceitos da Portaria SAS/MS nº 706/2014, Portaria GM/MS nº 1.675/2018, Art. 35 e Parágrafo Único da RDC Anvisa nº 11/2014 e diretrizes de auditoria da SMSA-BH / SUS-BH com assinatura eletrônica coletada em tablet."
              </div>
            </div>

            <div class="signature-section">
              <span class="signature-label">
                Assinatura Manuscrita ${isResp ? 'do Responsável Legal (Declaração a Rogo)' : 'do Paciente'} Coletada em Tablet:
              </span>
              ${registro.assinatura_base64
                ? `<img src="${registro.assinatura_base64}" alt="Assinatura" class="signature-img" />`
                : `<div style="padding: 24px; color: #94a3b8; font-style: italic;">Sem assinatura registrada</div>`
              }
              <div class="signature-footer">
                ${isResp ? registro.nome_responsavel : registro.nome_paciente} • Data/Hora da Coleta: ${registro.dt_registro || registro.data}
              </div>
            </div>

            <div class="legal-box">
              <strong>Autenticidade, Rastreabilidade e Guarda Permanente (Federal • MG • Belo Horizonte):</strong> Registro eletrônico permanente vinculado ao prontuário médico sob a <strong>Lei Federal nº 14.063/2020</strong> (Hash SHA-256: <code>${registro.hash_integridade || 'Chave Inviolável'}</code>), <strong>Portaria SAS/MS nº 706/2014</strong> (CFID), <strong>Portaria GM/MS nº 1.675/2018</strong>, <strong>RDC Anvisa nº 11/2014 (Art. 35 e Parágrafo Único)</strong>, <strong>Código de Saúde de MG (Lei Estadual nº 13.317/1999 — SES-MG)</strong>, <strong>Código Sanitário de Belo Horizonte (Lei Municipal nº 7.031/1996 — VISA-BH)</strong>, normas de Auditoria Assistencial da <strong>SMSA-BH / SUS-BH</strong>, <strong>Lei Federal nº 13.787/2018</strong> e <strong>Lei nº 13.709/2018 (LGPD)</strong>.
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 3000);
    }, 250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-signature-title"
      className="fixed inset-0 z-50 bg-[#172d48]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="fp-panel-bg rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border fp-border print:border-none print:shadow-none animate-fadeIn my-auto max-h-[95vh]">
        
        {/* Cabeçalho com cor institucional #40baab */}
        <div className="fp-selected-bg fp-text p-4 sm:p-5 flex items-center justify-between border-b fp-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{compareceu ? '📋' : '🔍'}</span>
            <div>
              <span className="text-xs uppercase tracking-wider fp-text font-extrabold block">
                Verificação de Assinatura • Histórico CFID • SMSA-BH / SUS-BH
              </span>
              <h3 id="view-signature-title" className="text-lg font-black fp-text">
                {compareceu ? 'Ficha de Comparecimento de Hemodiálise' : 'Verificação de Assinatura do Paciente'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="fp-text hover:text-red-700 text-2xl font-bold px-2 py-1 transition-colors print:hidden"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo do Documento */}
        <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
          <div className="border fp-border rounded-xl p-4 fp-field-bg space-y-3">
            <div className="flex justify-between items-start border-b fp-border pb-3">
              <div>
                <span className="text-xs fp-selection-text font-bold uppercase">Paciente</span>
                <h4 className="text-xl font-bold fp-text">{registro.nome_paciente}</h4>
                <p className="text-xs fp-muted font-mono mt-0.5">
                  Código MV: {registro.cd_paciente} • Procedimento SUS: {registro.cd_procedimento_sus || '03.05.01.010-7'} • CID: {registro.cd_cid || 'N18.0'}
                </p>
              </div>

              {/* Badge de Comparecido ou Não Comparecido */}
              {compareceu ? (
                <span className="px-3 py-1 fp-selected-bg fp-selection-text rounded-full text-xs font-bold flex items-center gap-1.5 border fp-border">
                  <span>✓</span> Comparecido
                </span>
              ) : (
                <span className="px-3 py-1 fp-neutral-bg fp-text rounded-full text-xs font-bold flex items-center gap-1.5 border fp-border">
                  <span>○</span> Não comparecido
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="fp-selection-text font-semibold block">Data da Sessão:</span>
                <strong className="fp-text text-sm">{formatDateBR(registro.data)}</strong>
              </div>
              <div>
                <span className="fp-selection-text font-semibold block">Turno:</span>
                <strong className="fp-text text-sm">{registro.horario_desc || '1º Turno (Manhã)'}</strong>
              </div>
              <div>
                <span className="fp-selection-text font-semibold block">Hora Registro:</span>
                <strong className="fp-text text-sm">
                  {compareceu ? (registro.hora_registro || registro.dt_registro || '-') : 'Não registrado'}
                </strong>
              </div>
              <div>
                <span className="fp-selection-text font-semibold block">Horário da Sessão:</span>
                <strong className="fp-text">
                  {registro.hora_inicio && registro.hora_fim ? `${registro.hora_inicio} às ${registro.hora_fim}` : 'Horário regular'}
                </strong>
              </div>
              <div>
                <span className="fp-selection-text font-semibold block">Acesso Vascular:</span>
                <strong className="fp-text">{registro.tipo_acesso || 'FAV'}</strong>
              </div>
              <div>
                <span className="fp-selection-text font-semibold block">Signatário:</span>
                <strong className="fp-text">
                  {isResp ? `Resp: ${registro.nome_responsavel || 'Legal'}` : 'O Próprio Paciente'}
                </strong>
              </div>
            </div>

            {isResp && (registro.doc_responsavel || registro.motivo_responsavel) && (
              <div className="fp-panel-bg p-2.5 rounded-lg border fp-border text-xs fp-text space-y-1">
                {registro.doc_responsavel && (
                  <div><strong>Documento do Responsável:</strong> {registro.doc_responsavel} ({registro.parentesco_responsavel || 'Responsável Legal'})</div>
                )}
                {registro.motivo_responsavel && (
                  <div><strong>Motivo Legal (Art. 595 CC / Portaria 706/2014):</strong> {registro.motivo_responsavel}</div>
                )}
              </div>
            )}

            {/* Destaque do Dialisador (RDC Anvisa nº 11/2014 - Art. 35) */}
            <div className="fp-panel-bg p-2.5 rounded-lg border fp-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold fp-text">Dialisador (Art. 35 RDC Anvisa 11/2014):</span>
              {isNovo ? (
                <span className="px-2.5 py-1 fp-confirm-bg fp-selection-text rounded-md font-bold border fp-border">
                  ✨ 1º USO / DIALISADOR NOVO — Lote: {registro.lote_dialisador || 'Informado'} {dtPrimUso ? `• 1º Uso: ${dtPrimUso}` : ''}
                </span>
              ) : (
                <span className="px-2.5 py-1 fp-field-bg fp-text rounded-md font-medium border fp-border">
                  Dialisador Reúso nº {registro.num_reuso || 1} {dtPrimUso ? `• 1º Uso: ${dtPrimUso}` : ''}
                </span>
              )}
            </div>

            <div className="text-xs fp-text italic fp-panel-bg p-2.5 rounded-lg border fp-border">
              {compareceu ? (
                `"${formatDateLongBR(registro.data)}: Sessão realizada e confirmada com assinatura eletrônica coletada em dispositivo móvel (tablet) nos termos da Portaria SAS/MS nº 706/2014 e Art. 35 da RDC Anvisa nº 11/2014."`
              ) : (
                `"${formatDateLongBR(registro.data)}: Paciente com escala nesta data, porém constando como Não Comparecido à sessão de hemodiálise."`
              )}
            </div>
          </div>

          {/* Área da Assinatura ou Aviso de Não Comparecimento */}
          <div>
            <span className="text-xs font-bold fp-selection-text uppercase block mb-1.5">
              Assinatura {isResp ? 'do Responsável Legal (a rogo)' : 'do Paciente'}:
            </span>

            {compareceu ? (
              <div className="border-2 border-dashed fp-border rounded-xl p-3 fp-panel-bg flex flex-col items-center justify-center min-h-[160px]">
                <img
                  src={registro.assinatura_base64}
                  alt={`Assinatura de ${registro.nome_paciente}`}
                  className="max-h-48 object-contain rounded-lg shadow-xs"
                />
                <div className="w-full border-t fp-border mt-2 pt-1 text-center">
                  <small className="text-[11px] fp-muted font-medium block">
                    {isResp ? `${registro.nome_responsavel} (Responsável Legal)` : registro.nome_paciente} • {registro.dt_registro || registro.data} • Operador MV: {registro.usuario_registro || 'SISTEMA'}
                  </small>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed fp-border rounded-xl p-6 fp-field-bg flex flex-col items-center justify-center text-center space-y-2 min-h-[150px]">
                <MonochromeIcon name="document" className="fp-semantic-icon" />
                <h5 className="text-sm font-bold fp-text">Sem assinatura registrada</h5>
                <p className="text-xs fp-muted max-w-md">
                  O paciente <strong>{registro.nome_paciente}</strong> não compareceu à sessão nesta data,
                  portanto não há assinatura coletada em tablet registrada no banco de dados.
                </p>
                <span className="text-[11px] fp-muted">
                  Auditoria de Presença • Registro Permanente
                </span>
              </div>
            )}
          </div>

          {registro.hash_integridade && (
            <div className="text-[10px] fp-muted font-mono fp-field-bg p-2 rounded border fp-border truncate">
              <strong>Hash SHA-256 (Lei Federal nº 14.063/2020):</strong> {registro.hash_integridade}
            </div>
          )}

          <div className="text-[11px] fp-muted fp-field-bg p-2.5 rounded-lg border fp-border">
            <strong>Autenticidade e Guarda Permanente (Federal • MG • Belo Horizonte):</strong> Este registro possui validade jurídica
            comprovatória sob a Portaria SAS/MS nº 706/2014 (CFID), Portaria GM/MS nº 1.675/2018, RDC Anvisa nº 11/2014 (Art. 35 e Parágrafo Único), Lei Federal nº 14.063/2020, Lei Federal nº 13.787/2018, Lei nº 13.709/2018 (LGPD), Código de Saúde de Minas Gerais (Lei Estadual nº 13.317/1999 — SES-MG), Código Sanitário de Belo Horizonte (Lei Municipal nº 7.031/1996 — VISA-BH), normas de Auditoria Assistencial da SMSA-BH / SUS-BH e Resoluções do CRM-MG e COREN-MG.
          </div>
        </div>

        {/* Ações */}
        <div className="p-4 fp-field-bg border-t fp-border flex flex-wrap items-center justify-between gap-3 print:hidden">
          {(!registro.isPastDate || isMaster) && compareceu && onDesmarcar ? (
            <button
              type="button"
              onClick={() => onDesmarcar(registro.id)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
            >
              Desmarcar presença / Cancelar assinatura {isMaster ? '(Acesso Master)' : ''}
            </button>
          ) : (!registro.isPastDate || isMaster) && !compareceu && onColetarAssinatura ? (
            <button
              type="button"
              onClick={() => onColetarAssinatura(registro)}
              className="text-xs font-bold fp-selection-text hover:underline flex items-center gap-1"
            >
              <MonochromeIcon name="signature" className="fp-semantic-icon" /> Coletar assinatura no tablet agora {isMaster ? '(Acesso Master)' : ''}
            </button>
          ) : (
            <div className="text-xs fp-muted italic">
              {registro.isPastDate ? 'Histórico consolidado (somente leitura)' : ''}
            </div>
          )}

          <div className="flex items-center gap-2">
            {compareceu && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 text-sm font-semibold fp-selection-text fp-panel-bg border fp-border hover:bg-[#f0faf8] rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <span>🖨️</span> Imprimir Ficha
              </button>
            )}
            <Button onClick={onClose} className="px-4 py-2 text-sm">
              Fechar
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ViewSignatureModal;
