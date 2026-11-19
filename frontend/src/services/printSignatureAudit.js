import { formatDateBR } from './schedule';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function buildSignatureAudit(data, registros) {
  const rows = [...registros].sort((a, b) =>
    (a.nome_paciente || '').localeCompare(b.nome_paciente || '', 'pt-BR')
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Auditoria Diária de Assinaturas — ${escapeHtml(formatDateBR(data))} — SUS Belo Horizonte / MG</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #172d48; margin: 0; line-height: 1.3; }
    .header { border-bottom: 2px solid #087b70; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { font-size: 14pt; margin: 0 0 4px; color: #087b70; text-transform: uppercase; font-weight: 900; }
    .header p { margin: 2px 0; font-size: 8pt; color: #334155; }
    .legal-tag { font-size: 7pt; color: #084b44; font-weight: bold; margin-top: 4px; text-transform: uppercase; }
    article { break-inside: avoid; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; background: #fafcfa; }
    h2 { font-size: 10pt; margin: 0 0 5px; color: #084b44; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2ece9; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 7.8pt; margin-bottom: 6px; }
    .grid strong { color: #087b70; }
    .sig-box { display: flex; align-items: center; gap: 12px; border-top: 1px dashed #d5e7e4; padding-top: 6px; margin-top: 4px; }
    .sig-img { height: 50px; max-width: 180px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; background: #fff; padding: 2px; }
    .sig-info { font-size: 7.5pt; color: #475569; }
    .hash { font-family: monospace; font-size: 6.8pt; color: #64748b; background: #f1f5f9; padding: 2px 4px; border-radius: 3px; word-break: break-all; margin-top: 2px; display: inline-block; }
    .badge-novo { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 7pt; }
    .badge-reuso { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 1px 4px; border-radius: 3px; font-size: 7pt; }
    footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 7pt; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Hospital de Referência Modelo • NefroSmart — Auditoria de Assinaturas</h1>
    <p><strong>Unidade de Hemodiálise / TRS • CNES: 2151609 • Belo Horizonte / MG</strong></p>
    <p>Data da Sessão: <strong>${escapeHtml(formatDateBR(data))}</strong> · Total de Registros: <strong>${rows.length}</strong> · Emitido em: ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
    <div class="legal-tag">
      Conformidade: Portaria SAS/MS nº 706/2014 • RDC Anvisa nº 11/2014 • Lei Federal nº 14.063/2020 • SMSA-BH / SUS-BH • Lei Municipal BH nº 7.031/1996 • CRM-MG
    </div>
  </div>

  ${rows.map((r, i) => {
    const isNovo = r.sn_dialisador_novo === 'S';
    const dtPrimUso = r.dt_primeiro_uso_dialisador ? ` (1º Uso: ${escapeHtml(formatDateBR(r.dt_primeiro_uso_dialisador))})` : '';
    const dialisadorBadge = isNovo
      ? `<span class="badge-novo">✨ 1º Uso / Novo (Lote: ${escapeHtml(r.lote_dialisador || 'S/L')})${dtPrimUso}</span>`
      : `<span class="badge-reuso">Reúso nº ${escapeHtml(r.num_reuso || '1')}${dtPrimUso}</span>`;

    const isResp = r.tipo_assinante === 'RESPONSAVEL';
    const signatarioTxt = isResp
      ? `Responsável Legal (a rogo): ${escapeHtml(r.nome_responsavel || 'Não informado')} (${escapeHtml(r.doc_responsavel || 'S/Doc')})${r.motivo_responsavel ? ` — ${escapeHtml(r.motivo_responsavel)}` : ''}`
      : 'O Próprio Paciente';

    const hrSessao = (r.hora_inicio && r.hora_fim)
      ? `${escapeHtml(r.hora_inicio)} às ${escapeHtml(r.hora_fim)}`
      : (r.hora_registro || '-');

    const image = /^data:image\/(?:png|jpeg);base64,[a-z0-9+/=\s]+$/i.test(r.assinatura_base64 || '')
      ? `<img src="${escapeHtml(r.assinatura_base64)}" alt="Assinatura" class="sig-img">`
      : '<span style="color: #94a3b8; font-style: italic; font-size: 7.5pt;">Assinatura não coletada</span>';

    return `
    <article>
      <h2>
        <span>${i + 1}. ${escapeHtml(r.nome_paciente || 'Paciente sem nome')} (Cód: ${escapeHtml(r.cd_paciente)})</span>
        <span style="font-size: 8pt; font-weight: normal; color: #475569;">Turno: <strong>${escapeHtml(r.horario_desc || r.turno || 'Não informado')}</strong></span>
      </h2>
      <div class="grid">
        <div><strong>Horário da Diálise:</strong> ${escapeHtml(hrSessao)}</div>
        <div><strong>Acesso Vascular:</strong> ${escapeHtml(r.tipo_acesso || 'FAV')}</div>
        <div><strong>Dialisador (RDC 11/14):</strong> ${dialisadorBadge}</div>
        <div><strong>Signatário:</strong> ${escapeHtml(signatarioTxt)}</div>
        <div><strong>Registro:</strong> ${escapeHtml(r.dt_registro || r.hora_registro || '-')}</div>
        <div><strong>Operador Responsável:</strong> ${escapeHtml(r.usuario_registro || 'Sistema')}</div>
      </div>
      ${r.intercorrencias ? `<div style="font-size: 7.5pt; color: #b45309; margin-bottom: 4px;"><strong>Intercorrências:</strong> ${escapeHtml(r.intercorrencias)}</div>` : ''}
      <div class="sig-box">
        ${image}
        <div class="sig-info">
          <div>Status: <strong>${escapeHtml(r.status || 'COMPARECIDO')}</strong></div>
          ${r.hash_integridade ? `<div>Hash SHA-256 (Lei 14.063/2020): <span class="hash">${escapeHtml(r.hash_integridade)}</span></div>` : ''}
        </div>
      </div>
    </article>`;
  }).join('')}

  <footer>
    Hospital de Referência Modelo • Instituição de Saúde Modelo — Documento para Auditoria da Vigilância Sanitária e SUS/APAC Belo Horizonte.
  </footer>
</body>
</html>`;
}

export async function printSignatureAudit(data, registros) {
  const frame = document.createElement('iframe');
  frame.title = 'Impressão da auditoria de assinaturas';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0';
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
    doc.write(buildSignatureAudit(data, registros));
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
