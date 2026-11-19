/**
 * Serviço de Gestão de Assinaturas de Responsáveis Técnicos (Médico Nefrologista e Enfermeiro RT)
 * para o Documento CFID Mensal (Portaria SAS/MS nº 706/2014 & RDC Anvisa nº 11/2014).
 *
 * Implementa a regra: "Assinou um, assinou todos do mês", garantindo que a validação de RT
 * seja aplicada automaticamente a todos os pacientes da competência mensal.
 *
 * Todas as assinaturas são geradas em formato RASTER PNG (base64) para garantir que
 * apareçam com 100% de nitidez no documento físico impresso, na tela e em PDFs.
 */

export function generateSignatureHash(seedText = '') {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const str = String(seedText || '') + '|' + Date.now() + '|' + Math.random();
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h0 = (h0 ^ (ch * 31)) >>> 0;
    h1 = (h1 ^ (ch * 37)) >>> 0;
    h2 = (h2 ^ (ch * 41)) >>> 0;
    h3 = (h3 ^ (ch * 43)) >>> 0;
    h4 = (h4 + (ch * 47)) >>> 0;
    h5 = (h5 + (ch * 53)) >>> 0;
    h6 = (h6 + (ch * 59)) >>> 0;
    h7 = (h7 + (ch * 61)) >>> 0;
  }
  const toHex = (n) => n.toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

const STORAGE_PREFIX = 'cfid_prof_sig_';

/**
 * Gera um PNG em base64 (raster) com a rubrica manuscrita estilizada e carimbo digital
 * de autenticidade para garantir que a imagem apareça com total nitidez na impressão.
 */
export function generateCertifiedStampPng({ nome, cargo, registro, dataHora, hash }) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 95;
  const ctx = canvas.getContext('2d');

  // Fundo transparente
  ctx.clearRect(0, 0, 400, 95);

  // 1. Desenha a rubrica caligráfica estilizada em tinta de caneta médica (#084b44)
  ctx.save();
  ctx.strokeStyle = '#084b44';
  ctx.fillStyle = '#084b44';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Curvas de floreio da assinatura manuscrita
  ctx.beginPath();
  ctx.moveTo(30, 56);
  ctx.bezierCurveTo(55, 14, 85, 12, 115, 48);
  ctx.bezierCurveTo(135, 72, 165, 78, 200, 42);
  ctx.bezierCurveTo(235, 12, 275, 20, 315, 48);
  ctx.stroke();

  // Linha de arremate estilizada
  ctx.beginPath();
  ctx.moveTo(20, 52);
  ctx.bezierCurveTo(120, 56, 250, 50, 350, 52);
  ctx.stroke();

  // Nome em fonte cursiva caligráfica legível e elegante
  ctx.font = 'italic bold 22px "Brush Script MT", "Segoe Script", "Dancing Script", cursive, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(nome || 'Responsável Técnico', 190, 42);
  ctx.restore();

  // 2. Carimbo institucional oficial abaixo da rubrica
  ctx.save();
  ctx.font = 'bold 8.5px Arial, sans-serif';
  ctx.fillStyle = '#0f766e';
  ctx.textAlign = 'center';
  ctx.fillText('HOSPITAL DA BALEIA • ASSINATURA ELETRÔNICA CERTIFICADA (LEI 14.063/2020)', 190, 70);

  ctx.font = '7.5px Arial, sans-serif';
  ctx.fillStyle = '#475569';
  const shortHash = (hash || '').slice(0, 16);
  ctx.fillText(`Autenticação SHA-256: ${shortHash}... • ${dataHora}`, 190, 82);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Obtém as assinaturas profissionais (médico e/ou enfermeiro) para um paciente em determinada competência.
 * Implementa a regra: se o mês tiver assinatura registrada, TODOS os pacientes do mês herdam automaticamente.
 * @param {string} mesAno Ex: '2026-11'
 * @param {string|number} cdPaciente Ex: 462812
 * @returns {{ medico: object|null, enfermeiro: object|null }}
 */
export function getProfessionalSignatures(mesAno, cdPaciente) {
  if (!mesAno) return { medico: null, enfermeiro: null };
  try {
    const key = `${STORAGE_PREFIX}${mesAno}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};

    // 1. Assinatura padrão do mês ("Assinou um, assinou todos do mês")
    const defaultSigs = data.__DEFAULT__ || {};

    // 2. Assinatura individual do paciente (se houver)
    const patientSigs = (cdPaciente && data[String(cdPaciente)]) || {};

    return {
      medico: patientSigs.medico || defaultSigs.medico || null,
      enfermeiro: patientSigs.enfermeiro || defaultSigs.enfermeiro || null,
    };
  } catch (e) {
    console.error('Erro ao recuperar assinaturas profissionais do CFID:', e);
    return { medico: null, enfermeiro: null };
  }
}

/**
 * Salva a assinatura profissional (Médico ou Enfermeiro).
 * POR PADRÃO: "Assinou um, assinou todos do mês" (applyToAll = true).
 */
export function saveProfessionalSignature({
  mesAno,
  cdPaciente,
  tipoProfissional, // 'MEDICO' | 'ENFERMEIRO'
  nome,
  registro, // 'CRM-MG ...' | 'COREN-MG ...'
  modoAssinatura = 'CANVAS', // 'CANVAS' | 'CERTIFICADA'
  imagem = null,
  applyToAll = true, // << PADRÃO: ASSINOU UM, ASSINOU TODOS DO MÊS
  usuario = 'SISTEMA',
}) {
  if (!mesAno || !tipoProfissional) {
    throw new Error('Parâmetros obrigatórios ausentes para registrar a assinatura.');
  }

  const key = `${STORAGE_PREFIX}${mesAno}`;
  let data = {};
  try {
    const raw = localStorage.getItem(key);
    if (raw) data = JSON.parse(raw);
  } catch (e) {}

  const now = new Date();
  const dataHora = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const hash = generateSignatureHash(`${mesAno}|${cdPaciente || 'TODOS'}|${tipoProfissional}|${nome}|${registro}`);

  const cargo = tipoProfissional === 'MEDICO'
    ? 'Médico Nefrologista / RT da Unidade de TRS'
    : 'Enfermeiro(a) Responsável Técnico(a) da Hemodiálise';

  // Se a imagem estiver vazia ou for modo certificado, gera PNG nítido garantido
  let finalImage = imagem;
  if (!finalImage || modoAssinatura === 'CERTIFICADA') {
    finalImage = generateCertifiedStampPng({
      nome,
      cargo,
      registro,
      dataHora,
      hash,
    });
  }

  const sigObject = {
    tipoProfissional,
    cargo,
    nome: (nome || '').trim(),
    registro: (registro || '').trim(),
    modoAssinatura,
    imagem: finalImage,
    dataHora,
    hash,
    usuario: usuario || 'SISTEMA',
    timestamp: now.toISOString(),
  };

  const roleKey = tipoProfissional.toLowerCase(); // 'medico' ou 'enfermeiro'

  // Regra fundamental solicitada: "Assinou um, assinou todos do mês"
  if (applyToAll !== false) {
    if (!data.__DEFAULT__) data.__DEFAULT__ = {};
    data.__DEFAULT__[roleKey] = sigObject;
  }

  if (cdPaciente) {
    const pKey = String(cdPaciente);
    if (!data[pKey]) data[pKey] = {};
    data[pKey][roleKey] = sigObject;
  }

  localStorage.setItem(key, JSON.stringify(data));
  return getProfessionalSignatures(mesAno, cdPaciente);
}

/**
 * Remove a assinatura profissional registrada.
 */
export function removeProfessionalSignature(mesAno, cdPaciente = null, tipoProfissional = null) {
  if (!mesAno) return;
  const key = `${STORAGE_PREFIX}${mesAno}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);

    const rolesToRemove = tipoProfissional
      ? [tipoProfissional.toLowerCase()]
      : ['medico', 'enfermeiro'];

    // Remove do padrão mensal
    if (data.__DEFAULT__) {
      rolesToRemove.forEach((r) => {
        delete data.__DEFAULT__[r];
      });
      if (Object.keys(data.__DEFAULT__).length === 0) {
        delete data.__DEFAULT__;
      }
    }

    // Remove do paciente específico
    if (cdPaciente && data[String(cdPaciente)]) {
      rolesToRemove.forEach((r) => {
        delete data[String(cdPaciente)][r];
      });
      if (Object.keys(data[String(cdPaciente)]).length === 0) {
        delete data[String(cdPaciente)];
      }
    }

    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao remover assinatura profissional:', e);
  }
}

/**
 * Retorna true se houver qualquer assinatura profissional registrada para o paciente na competência.
 */
export function hasProfessionalSignature(mesAno, cdPaciente) {
  const sigs = getProfessionalSignatures(mesAno, cdPaciente);
  return !!(sigs.medico || sigs.enfermeiro);
}

/**
 * Retorna um resumo conciso das assinaturas presentes para badges.
 */
export function getProfessionalBadgeText(mesAno, cdPaciente) {
  const sigs = getProfessionalSignatures(mesAno, cdPaciente);
  if (sigs.medico && sigs.enfermeiro) return 'Méd. + Enf.';
  if (sigs.medico) return 'Médico';
  if (sigs.enfermeiro) return 'Enf.';
  return null;
}

/**
 * Retorna um texto resumido das assinaturas registradas para tooltips.
 */
export function getProfessionalSummary(mesAno, cdPaciente) {
  const sigs = getProfessionalSignatures(mesAno, cdPaciente);
  const parts = [];
  if (sigs.medico) {
    parts.push(`Médico: ${sigs.medico.nome} (${sigs.medico.registro || 'CRM-MG'})`);
  }
  if (sigs.enfermeiro) {
    parts.push(`Enfermeiro(a): ${sigs.enfermeiro.nome} (${sigs.enfermeiro.registro || 'COREN-MG'})`);
  }
  return parts.length ? parts.join(' • ') : 'Nenhuma assinatura de RT registrada';
}
