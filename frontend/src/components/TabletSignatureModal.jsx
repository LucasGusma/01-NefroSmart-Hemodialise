import MonochromeIcon from './MonochromeIcon';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Button from './Button';
import { formatDateBR, formatDateLongBR } from '../services/schedule';

const computeHoraFim = (horaInicio) => {
  if (!horaInicio) return '10:00';
  const parts = horaInicio.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0])) return '10:00';
  const endH = (parts[0] + 4) % 24;
  return `${String(endH).padStart(2, '0')}:${String(parts[1] || 0).padStart(2, '0')}`;
};

const normalizeTipoAcesso = (dsAcesso) => {
  const s = String(dsAcesso || '').toUpperCase();
  if (s.includes('PERM')) return 'PERMCATH';
  if (s.includes('CDL') || s.includes('CATETER')) return 'CDL';
  if (s.includes('PROTESE') || s.includes('PRÓTESE')) return 'PROTESE';
  return 'FAV';
};

const TabletSignatureModal = ({
  isOpen,
  paciente,
  dataSelecionada,
  turno,
  onConfirm,
  onClose,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [strokesHistory, setStrokesHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('pt-BR'));
  const currentStrokeRef = useRef([]);

  // Campos de Conformidade Regulatória (Portaria SAS/MS 706/2014, Portaria GM/MS 1.675/2018 & RDC Anvisa 11/2014)
  const defaultHoraInicio = turno?.horarioPadrao || '06:00';
  const [horaInicio, setHoraInicio] = useState(defaultHoraInicio);
  const [horaFim, setHoraFim] = useState(() => computeHoraFim(defaultHoraInicio));
  const [tipoAcesso, setTipoAcesso] = useState(() => normalizeTipoAcesso(paciente?.ds_acesso));
  const [intercorrencias, setIntercorrencias] = useState('SEM_INTERCORRENCIAS');
  const [intercorrenciasDesc, setIntercorrenciasDesc] = useState('');

  // RDC Anvisa nº 11/2014 (Art. 35 caput e Parágrafo Único) - Dialisador Novo, Data do 1º Uso e Reúso
  const [snDialisadorNovo, setSnDialisadorNovo] = useState(false);
  const [loteDialisador, setLoteDialisador] = useState('');
  const [dtPrimeiroUsoDialisador, setDtPrimeiroUsoDialisador] = useState(dataSelecionada || '');
  const [numReuso, setNumReuso] = useState(1);

  // Portaria SAS/MS nº 706/2014 & Art. 595 do Código Civil - Signatário (Paciente ou Responsável Legal / A Rogo)
  const [tipoAssinante, setTipoAssinante] = useState('PACIENTE');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [docResponsavel, setDocResponsavel] = useState('');
  const [parentescoResponsavel, setParentescoResponsavel] = useState('');
  const [motivoResponsavel, setMotivoResponsavel] = useState('Punção de FAV / Cateter no membro dominante imobilizado na sessão');

  // LGPD (Lei Federal nº 13.709/2018 - Art. 11, II, tutela da saúde e obrigação legal SUS/APAC)
  const [lgpdConsentimento, setLgpdConsentimento] = useState(true);

  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const checkIsBlueLayout = useCallback(() => {
    if (typeof document === 'undefined') return false;
    const theme = document.querySelector('.app-shell')?.getAttribute('data-theme') || '';
    return theme === 'baleia' || theme === 'dark';
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isBlue = checkIsBlueLayout();
    ctx.strokeStyle = isBlue ? '#ffffff' : '#084b44';
    ctx.lineWidth = 2.8;

    // Fundo do canvas: mais escuro nos tons de azul caso layout azul (#0b1624), ou branco se claro
    ctx.fillStyle = isBlue ? '#0b1624' : '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Linha de base da assinatura pontilhada
    ctx.save();
    ctx.strokeStyle = isBlue ? '#38bdf8' : '#40baab';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 35);
    ctx.lineTo(rect.width - 30, rect.height - 35);
    ctx.stroke();
    ctx.restore();
  }, [checkIsBlueLayout]);

  useEffect(() => {
    if (isOpen) {
      setHasSignature(false);
      setStrokesHistory([]);
      currentStrokeRef.current = [];
      setLocalError(null);
      const hIni = turno?.horarioPadrao || '06:00';
      setHoraInicio(hIni);
      setHoraFim(computeHoraFim(hIni));
      setTipoAcesso(normalizeTipoAcesso(paciente?.ds_acesso));
      setDtPrimeiroUsoDialisador(dataSelecionada || new Date().toISOString().slice(0, 10));
      setLgpdConsentimento(true);
      const timer = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, turno, paciente, dataSelecionada, initCanvas]);

  const redrawAllStrokes = (strokes) => {
    initCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isBlue = checkIsBlueLayout();
    ctx.strokeStyle = isBlue ? '#ffffff' : '#084b44';
    ctx.lineWidth = 2.8;

    strokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch (err) {}
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setHasSignature(true);
    currentStrokeRef.current = [coords];

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const isBlue = checkIsBlueLayout();
    ctx.strokeStyle = isBlue ? '#ffffff' : '#084b44';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    currentStrokeRef.current.push(coords);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const isBlue = checkIsBlueLayout();
    ctx.strokeStyle = isBlue ? '#ffffff' : '#084b44';
    ctx.lineWidth = 2.8;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      setStrokesHistory((prev) => [...prev, [...currentStrokeRef.current]]);
      currentStrokeRef.current = [];
    }
    setHasSignature(true);
  };

  const handleClear = () => {
    initCanvas();
    setHasSignature(false);
    setStrokesHistory([]);
    currentStrokeRef.current = [];
  };

  const handleUndo = () => {
    if (strokesHistory.length === 0) return;
    const newHistory = strokesHistory.slice(0, -1);
    setStrokesHistory(newHistory);
    redrawAllStrokes(newHistory);
    setHasSignature(newHistory.length > 0);
  };

  const handleSave = () => {
    setLocalError(null);
    if (!canvasRef.current) return;

    if (tipoAssinante === 'RESPONSAVEL' && !nomeResponsavel.trim()) {
      setLocalError('Por favor, informe o nome completo do Responsável Legal / Signatário a rogo (Portaria SAS/MS nº 706/2014 e Art. 595 do Código Civil).');
      return;
    }

    if (snDialisadorNovo && !loteDialisador.trim()) {
      setLocalError('Por favor, informe o Lote do Dialisador Novo (exigência do Art. 35, Parágrafo Único da RDC Anvisa nº 11/2014).');
      return;
    }

    if (!lgpdConsentimento) {
      setLocalError('É necessária a confirmação de ciência para registro legal no prontuário e faturamento SUS/APAC (Lei nº 13.709/2018 - LGPD).');
      return;
    }

    const dataUrl = canvasRef.current.toDataURL('image/png');
    onConfirm({
      signatureDataUrl: dataUrl,
      sn_dialisador_novo: snDialisadorNovo ? 'S' : 'N',
      lote_dialisador: snDialisadorNovo ? loteDialisador.trim() : '',
      dt_primeiro_uso_dialisador: snDialisadorNovo ? (dtPrimeiroUsoDialisador || dataSelecionada) : (dtPrimeiroUsoDialisador || ''),
      num_reuso: snDialisadorNovo ? 0 : Number(numReuso || 0),
      tipo_assinante: tipoAssinante,
      nome_responsavel: tipoAssinante === 'RESPONSAVEL' ? nomeResponsavel.trim() : '',
      doc_responsavel: tipoAssinante === 'RESPONSAVEL' ? docResponsavel.trim() : '',
      parentesco_responsavel: tipoAssinante === 'RESPONSAVEL' ? parentescoResponsavel.trim() : '',
      motivo_responsavel: tipoAssinante === 'RESPONSAVEL' ? motivoResponsavel : '',
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      tipo_acesso: tipoAcesso,
      intercorrencias: intercorrencias === 'OUTRA' ? (intercorrenciasDesc || 'OUTRA') : intercorrencias,
      cd_procedimento_sus: paciente?.cd_procedimento_sus || '03.05.01.010-7',
      cd_cid: paciente?.cd_cid || 'N18.0',
      lgpd_consentimento: lgpdConsentimento ? 'S' : 'N',
    });
  };

  if (!isOpen || !paciente) return null;

  const displayError = localError || errorMessage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-dialog-title"
      className="tablet-signature-modal fixed inset-0 z-50 bg-[#172d48]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="fp-panel-bg rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border fp-border animate-fadeIn my-auto max-h-[96vh]">
        
        {/* Cabeçalho na cor institucional #40baab */}
        <div className="fp-selected-bg fp-text p-4 sm:p-5 border-b fp-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MonochromeIcon name="signature" className="fp-semantic-icon" />
              <div>
                <span className="text-xs uppercase tracking-wider fp-text font-extrabold block">
                  Hospital de Referência Modelo • CNES 2151609 • Nefrologia • CFID / SUS-BH
                </span>
                <h3 id="signature-dialog-title" className="text-lg sm:text-xl font-black fp-text">
                  Comprovante Individual de Presença — Hemodiálise
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="fp-text hover:text-red-700 text-2xl font-bold px-2 py-1 transition-colors"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo com Scroll para acomodar todos os requisitos regulatórios em tablets */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
          
          {/* Ficha e Dados do Paciente e da Sessão */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="fp-panel-bg p-3 rounded-xl border fp-border shadow-xs">
              <span className="text-xs font-bold fp-selection-text uppercase block">Paciente</span>
              <strong className="text-base fp-text block truncate">{paciente.nome_paciente}</strong>
              <small className="text-xs fp-muted">
                Prontuário MV: {paciente.cd_paciente} • Proced. SUS: {paciente.cd_procedimento_sus || '03.05.01.010-7'}
              </small>
            </div>

            <div className="fp-panel-bg p-3 rounded-xl border fp-border shadow-xs">
              <span className="text-xs font-bold fp-selection-text uppercase block">Data da Sessão</span>
              <strong className="text-base fp-text block">{formatDateBR(dataSelecionada)}</strong>
              <small className="text-xs fp-muted">{formatDateLongBR(dataSelecionada)}</small>
            </div>

            <div className="fp-panel-bg p-3 rounded-xl border fp-border shadow-xs">
              <span className="text-xs font-bold fp-selection-text uppercase block">Turno / Horário</span>
              <strong className="text-base fp-text block">{turno?.nome || '1º Turno (Manhã)'}</strong>
              <small className="text-xs fp-muted">Horário atual: {currentTime}</small>
            </div>
          </div>

          {/* Seção 1: Dados do Procedimento Dialítico (Portaria SAS/MS nº 706/2014 & Portaria GM/MS nº 1.675/2018) */}
          <div className="tsm-card-static bg-[#f8faf9] border fp-border rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b fp-border pb-2">
              <span className="text-xs font-bold fp-selection-text uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️</span> Parâmetros da Sessão (Portaria SAS/MS nº 706/2014 & Portaria GM/MS nº 1.675/2018 - CFID)
              </span>
              <span className="text-[11px] font-semibold fp-muted">
                CID-10: {paciente?.cd_cid || 'N18.0'} • SMSA-BH / APAC
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold fp-text block mb-1">Horário Início:</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => {
                    setHoraInicio(e.target.value);
                    setHoraFim(computeHoraFim(e.target.value));
                  }}
                  className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-text font-medium"
                />
              </div>

              <div>
                <label className="font-bold fp-text block mb-1">Horário Término:</label>
                <input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-text font-medium"
                />
              </div>

              <div>
                <label className="font-bold fp-text block mb-1">Acesso Vascular:</label>
                <select
                  value={tipoAcesso}
                  onChange={(e) => setTipoAcesso(e.target.value)}
                  className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-text font-medium fp-panel-bg"
                >
                  <option value="FAV">FAV (Fístula Arteriovenosa)</option>
                  <option value="CDL">CDL (Cateter Duplo Lúmen)</option>
                  <option value="PERMCATH">Permcath (Longa Permanência)</option>
                  <option value="PROTESE">Prótese Vascular (PTFE)</option>
                </select>
              </div>

              <div>
                <label className="font-bold fp-text block mb-1">Intercorrências Clínicas:</label>
                <select
                  value={intercorrencias}
                  onChange={(e) => setIntercorrencias(e.target.value)}
                  className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-text font-medium fp-panel-bg"
                >
                  <option value="SEM_INTERCORRENCIAS">Sem Intercorrências</option>
                  <option value="HIPOTENSAO">Hipotensão Arterial</option>
                  <option value="CAIMBRAS">Câimbras Musculares</option>
                  <option value="COAGULACAO_SISTEMA">Coagulação do Sistema Extracorpóreo</option>
                  <option value="FLUXO_INSUFICIENTE">Fluxo Vascular Insuficiente</option>
                  <option value="OUTRA">Outra Intercorrência</option>
                </select>
              </div>
            </div>

            {intercorrencias === 'OUTRA' && (
              <div>
                <input
                  type="text"
                  placeholder="Descreva a intercorrência clínica observada na sessão..."
                  value={intercorrenciasDesc}
                  onChange={(e) => setIntercorrenciasDesc(e.target.value)}
                  className="tsm-field-writable w-full p-2 text-xs border fp-border fp-warning-bg rounded-lg fp-text font-medium"
                />
              </div>
            )}
          </div>

          {/* Seção 2: Controle de Dialisador (RDC Anvisa nº 11/2014 — Art. 35 e Parágrafo Único) */}
          <div className="tsm-card-static bg-[#eef8f6] border fp-border rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b fp-border pb-2">
              <span className="text-xs font-bold fp-selection-text uppercase tracking-wider flex items-center gap-1.5">
                <span>🧪</span> Controle de Dialisador / Capilar (RDC Anvisa nº 11/2014 — Art. 35 e Parágrafo Único)
              </span>
              <span className="tsm-subtle-tag text-[11px] font-semibold fp-selection-text fp-panel-bg px-2 py-0.5 rounded border fp-border">
                Exigência Sanitária ANVISA & VISA-BH
              </span>
            </div>

            <div className="space-y-3">
              {/* Opção 1: Seleção de Dialisador Novo vs Em Reúso */}
              <div className="tsm-field-writable flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border fp-border fp-panel-bg shadow-2xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={snDialisadorNovo}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSnDialisadorNovo(checked);
                      if (checked) {
                        setDtPrimeiroUsoDialisador(dataSelecionada);
                      }
                    }}
                    className="w-4 h-4 fp-selection-text rounded fp-border focus:ring-[#087b70]"
                  />
                  <span className="text-xs font-bold fp-text">
                    DIALISADOR NOVO (1º Uso / Capilar Virgem)
                  </span>
                </label>
                <span
                  className={`tsm-dialisador-badge text-[11px] font-bold px-2.5 py-1 rounded-md border select-none transition-colors ${
                    snDialisadorNovo
                      ? 'tsm-badge-virgem bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'tsm-badge-reuso bg-sky-50 text-sky-800 border-sky-300'
                  }`}
                >
                  {snDialisadorNovo ? '✨ 1º Uso (Virgem)' : `🔄 Em Reúso (${numReuso}º uso)`}
                </span>
              </div>

              {/* Opção 2 & 3: Campos organizados em 2 colunas com labels dedicados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="min-w-0">
                  {snDialisadorNovo ? (
                    <div>
                      <label className="font-bold fp-text block mb-1">
                        Nº do Lote do Dialisador Novo:* (Art. 35 RDC 11/14)
                      </label>
                      <input
                        type="text"
                        placeholder="Lote do dialisador novo (ex: LOT-98421)..."
                        value={loteDialisador}
                        onChange={(e) => setLoteDialisador(e.target.value)}
                        className="tsm-field-writable w-full p-2 border fp-border fp-panel-bg rounded-lg fp-text font-bold focus:outline-none focus:ring-2 focus:ring-[#40baab]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold fp-text block mb-1">
                        Nº do Reúso Atual (RDC Anvisa nº 11/2014):
                      </label>
                      <select
                        value={numReuso}
                        onChange={(e) => setNumReuso(Number(e.target.value))}
                        className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-panel-bg font-bold fp-text focus:outline-none focus:ring-2 focus:ring-[#40baab]"
                      >
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}º Reúso {n <= 12 ? '(Manual / Autom.)' : '(Reproc. Automatizado RDC 11)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <label className="font-bold fp-text block mb-1">
                    Data do 1º Uso do Dialisador (Art. 35 RDC 11/14):
                  </label>
                  <input
                    type="date"
                    value={dtPrimeiroUsoDialisador}
                    onChange={(e) => setDtPrimeiroUsoDialisador(e.target.value)}
                    disabled={snDialisadorNovo}
                    className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-panel-bg fp-text font-medium disabled:bg-slate-100 disabled:opacity-80"
                  />
                </div>
              </div>
            </div>

            {snDialisadorNovo && (
              <div className="tsm-inner-notice text-[11px] text-[#065b53] fp-panel-bg p-2 rounded-lg border fp-border leading-relaxed">
                <strong>Termo Obrigatório — Art. 35, Parágrafo Único da RDC Anvisa nº 11/2014:</strong>{' '}
                <em>"O dialisador deve ser apresentado ao paciente antes de submetê-lo à hemodiálise, devidamente identificado e com registro da data do primeiro uso. Parágrafo único: O registro da utilização de um novo dialisador deve ser assinado pelo paciente e mantido no prontuário do mesmo."</em>
              </div>
            )}
          </div>

          {/* Seção 3: Identificação do Signatário (Paciente ou Responsável Legal — Portaria 706/2014 & Art. 595 CC) */}
          <div className="tsm-card-static bg-[#f8faf9] border fp-border rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b fp-border pb-2">
              <span className="text-xs font-bold fp-selection-text uppercase tracking-wider flex items-center gap-1.5">
                <span>👤</span> Identificação do Signatário (Portaria SAS/MS nº 706/2014 & Art. 595 Código Civil)
              </span>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold fp-text">
                  <input
                    type="radio"
                    name="tipoAssinante"
                    value="PACIENTE"
                    checked={tipoAssinante === 'PACIENTE'}
                    onChange={() => setTipoAssinante('PACIENTE')}
                    className="fp-selection-text focus:ring-[#087b70]"
                  />
                  O Próprio Paciente
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold fp-text">
                  <input
                    type="radio"
                    name="tipoAssinante"
                    value="RESPONSAVEL"
                    checked={tipoAssinante === 'RESPONSAVEL'}
                    onChange={() => setTipoAssinante('RESPONSAVEL')}
                    className="fp-selection-text focus:ring-[#087b70]"
                  />
                  Responsável Legal / Acompanhante (a rogo / curador)
                </label>
              </div>
            </div>

            {tipoAssinante === 'RESPONSAVEL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 animate-fadeIn">
                <div>
                  <label className="font-bold fp-text block mb-1">Nome Completo do Responsável:*</label>
                  <input
                    type="text"
                    placeholder="Nome completo..."
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-panel-bg fp-text font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold fp-text block mb-1">CPF ou Documento de Identidade:</label>
                  <input
                    type="text"
                    placeholder="CPF ou RG..."
                    value={docResponsavel}
                    onChange={(e) => setDocResponsavel(e.target.value)}
                    className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-panel-bg fp-text font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold fp-text block mb-1">Grau de Parentesco / Vínculo:</label>
                  <input
                    type="text"
                    placeholder="Ex: Cônjuge, Filho(a), Curador..."
                    value={parentescoResponsavel}
                    onChange={(e) => setParentescoResponsavel(e.target.value)}
                    className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-panel-bg fp-text font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold fp-text block mb-1">Motivo Legal da Assinatura por Responsável (SMSA-BH):*</label>
                  <select
                    value={motivoResponsavel}
                    onChange={(e) => setMotivoResponsavel(e.target.value)}
                    className="tsm-field-writable w-full p-2 border fp-border rounded-lg fp-panel-bg fp-text font-medium"
                  >
                    <option value="Punção de FAV / Cateter no membro dominante imobilizado na sessão">
                      FAV / Cateter no braço dominante imobilizado durante a diálise
                    </option>
                    <option value="Limitação motora, visual ou clínica do paciente">
                      Limitação motora, visual ou condição clínica aguda
                    </option>
                    <option value="Paciente não alfabetizado - Declaração a rogo (Art. 595 Código Civil)">
                      Paciente não alfabetizado — Assinatura a rogo (Art. 595 CC)
                    </option>
                    <option value="Paciente menor de idade, interditado ou sob curatela legal">
                      Paciente menor de idade, interditado ou sob curatela legal
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Declaração Formal de Comparecimento e Consentimento LGPD */}
          <div className="tsm-cfid-declaration fp-selected-bg border-l-4 fp-border p-3 rounded-r-lg text-xs fp-text leading-relaxed space-y-2">
            <div>
              <strong>Declaração Legal de Comparecimento e Tratamento Dialítico (CFID):</strong> Declaro sob as penas da lei que compareci à Unidade de Terapia Renal Substitutiva da Instituição de Saúde Modelo (Hospital de Referência Modelo • CNES 2151609 • Belo Horizonte/MG) na data indicada, conferi a identificação do dialisador apresentado antes da sessão (Art. 35 da RDC Anvisa nº 11/2014) e realizei a sessão programada de hemodiálise, para fins de comprovação no CFID (Portaria SAS/MS nº 706/2014, Portaria GM/MS nº 1.675/2018) e auditoria do SUS Belo Horizonte (SMSA-BH) e SES-MG.
            </div>
            <label className="flex items-start gap-2 cursor-pointer select-none pt-1 border-t fp-border">
              <input
                type="checkbox"
                checked={lgpdConsentimento}
                onChange={(e) => setLgpdConsentimento(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 fp-selection-text rounded fp-border"
              />
              <span className="text-[11px] fp-text">
                <strong>Termo de Ciência e Proteção de Dados (LGPD — Lei Federal nº 13.709/2018, Art. 11, II, "a" e "f"):</strong> Autorizo e declaro ciência do armazenamento permanente desta assinatura eletrônica (Lei nº 14.063/2020 e Lei nº 13.787/2018) exclusivamente para tutela da saúde, prontuário médico e prestação de contas obrigatória ao SUS / APAC / Vigilância Sanitária.
              </span>
            </label>
          </div>

          {/* Área de Coleta da Assinatura Digital */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold fp-selection-text uppercase tracking-wider">
                Assinatura Manuscrita {tipoAssinante === 'RESPONSAVEL' ? 'do Responsável Legal (a rogo)' : 'do Paciente'}:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokesHistory.length === 0 || isSubmitting}
                  className="text-xs px-2.5 py-1.5 fp-panel-bg border fp-border hover:bg-[#f0faf8] fp-selection-text rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Desfazer último traço"
                >
                  ↩ Desfazer
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!hasSignature || isSubmitting}
                  className="text-xs px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Limpar assinatura"
                >
                  🗑️ Limpar
                </button>
              </div>
            </div>

            {/* Canvas de Assinatura */}
            <div className="tsm-canvas-wrapper relative border-2 border-dashed fp-border rounded-xl fp-panel-bg shadow-inner overflow-hidden">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  touchAction: 'none',
                  width: '100%',
                  height: '210px',
                  cursor: 'crosshair',
                  display: 'block',
                }}
              />
              <div className="pointer-events-none absolute bottom-2 left-6 text-xs fp-selection-text select-none flex items-center gap-1.5 font-medium">
                <MonochromeIcon name="signature" className="fp-semantic-icon" /> Assine sobre a linha pontilhada utilizando a caneta do tablet ou o dedo
              </div>
            </div>

            {!hasSignature && (
              <p className="text-center text-xs fp-warning-text font-medium">
                Aguardando assinatura manuscrita na tela para habilitar a confirmação.
              </p>
            )}
          </div>

          {/* Exibição de Erro se o Salvamento ou Validação Falhar */}
          {displayError && (
            <div className="p-3 fp-error-bg border fp-border fp-error-text rounded-lg text-xs font-bold flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-1.5">
                <span>⚠️</span> {displayError}
              </span>
              <button onClick={() => setLocalError(null)} className="fp-error-text font-bold ml-2">✕</button>
            </div>
          )}

        </div>

        {/* Rodapé de Ações com Embasamento Jurídico Completo */}
        <div className="p-4 fp-field-bg border-t fp-border flex flex-wrap items-center justify-between gap-3">
          <small className="text-[11px] fp-muted max-w-md leading-tight block">
            Conformidade: Portaria SAS/MS nº 706/2014 (CFID), Portaria GM/MS nº 1.675/2018, RDC Anvisa nº 11/2014 (Art. 35), Lei nº 14.063/2020 (SHA-256), Lei nº 13.787/2018, Lei Estadual MG nº 13.317/1999, Lei Municipal BH nº 7.031/1996 e SMSA-BH.
          </small>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold fp-selection-text fp-panel-bg border fp-border hover:bg-[#f0faf8] rounded-lg shadow-xs transition-colors"
            >
              Cancelar
            </button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={(!hasSignature && strokesHistory.length === 0) || isSubmitting}
              className="px-5 py-2 text-sm font-bold !fp-selected-bg hover:!bg-[#06635a] !fp-text rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <MonochromeIcon name="clock" className="fp-semantic-icon" /> Salvando no Banco...
                </>
              ) : (
                <>
                  <span>✓</span> Confirmar Presença e Assinatura
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TabletSignatureModal;
