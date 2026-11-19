import React, { useRef, useState, useEffect, useCallback, useId } from 'react';
import MonochromeIcon from './MonochromeIcon';
import Button from './Button';
import {
  getProfessionalSignatures,
  saveProfessionalSignature,
  removeProfessionalSignature,
  generateCertifiedStampPng,
} from '../services/professionalSignatureService';
import { MESES_EXTENSO } from '../services/schedule';

const ProfessionalSignatureModal = ({
  isOpen,
  paciente,
  mesAno, // Ex: '2026-11'
  currentUser,
  onClose,
  onSaved, // Callback apos salvar
  onSaveAndPrint, // Callback para salvar e gerar o CFID
}) => {
  const canvasRef = useRef(null);
  const titleId = useId();

  const [tipoProfissional, setTipoProfissional] = useState('MEDICO'); // 'MEDICO' | 'ENFERMEIRO'
  const [modoAssinatura, setModoAssinatura] = useState('CANVAS'); // 'CANVAS' | 'CERTIFICADA'
  
  // Nomes e Registros Profissionais (com persistência para conveniência do usuário)
  const [nomeProfissional, setNomeProfissional] = useState(() => {
    return localStorage.getItem('last_prof_name_medico') || (currentUser?.nome || currentUser?.sub || 'Dr. Lucas Gusmão');
  });
  const [registroProfissional, setRegistroProfissional] = useState(() => {
    return localStorage.getItem('last_prof_reg_medico') || 'CRM-MG 78452';
  });

  // Termo e erros
  const [termoAceito, setTermoAceito] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Canvas state
  const [isDrawing, setIsDrawing] = useState(false);
  const strokesCountRef = useRef(0);

  // Assinaturas já existentes para este paciente / mês
  const [existingSigs, setExistingSigs] = useState({ medico: null, enfermeiro: null });

  // Competência formatada
  const [ano, mes] = (mesAno || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const nomeCompetencia = `${MESES_EXTENSO[(mes || 1) - 1] || ''} de ${ano || 2026}`;

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

    // Fundo do canvas: mais escuro no layout azul (#0b1624), ou branco
    ctx.fillStyle = isBlue ? '#0b1624' : '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Linha guia pontilhada
    ctx.save();
    ctx.strokeStyle = isBlue ? '#38bdf8' : '#40baab';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, rect.height - 30);
    ctx.lineTo(rect.width - 25, rect.height - 30);
    ctx.stroke();
    ctx.restore();

    strokesCountRef.current = 0;
  }, [checkIsBlueLayout]);

  // Recarrega assinaturas existentes ao abrir o modal
  useEffect(() => {
    if (isOpen && paciente && mesAno) {
      const sigs = getProfessionalSignatures(mesAno, paciente.cd_paciente);
      setExistingSigs(sigs);
      setErrorMessage(null);
      strokesCountRef.current = 0;

      // Pré-preenche conforme o tipo selecionado
      if (tipoProfissional === 'MEDICO') {
        setNomeProfissional(sigs.medico?.nome || localStorage.getItem('last_prof_name_medico') || 'Dr. Lucas Gusmão');
        setRegistroProfissional(sigs.medico?.registro || localStorage.getItem('last_prof_reg_medico') || 'CRM-MG 78452');
      } else {
        setNomeProfissional(sigs.enfermeiro?.nome || localStorage.getItem('last_prof_name_enf') || 'Enfª. Alessandra de Sousa');
        setRegistroProfissional(sigs.enfermeiro?.registro || localStorage.getItem('last_prof_reg_enf') || 'COREN-MG 312450');
      }

      setTimeout(() => {
        initCanvas();
      }, 60);
    }
  }, [isOpen, paciente, mesAno, tipoProfissional, initCanvas]);

  // Alterna o tipo profissional (Médico / Enfermeiro)
  const handleSelectTipo = (tipo) => {
    setTipoProfissional(tipo);
    setErrorMessage(null);
    strokesCountRef.current = 0;

    if (tipo === 'MEDICO') {
      setNomeProfissional(existingSigs.medico?.nome || localStorage.getItem('last_prof_name_medico') || 'Dr. Lucas Gusmão');
      setRegistroProfissional(existingSigs.medico?.registro || localStorage.getItem('last_prof_reg_medico') || 'CRM-MG 78452');
    } else {
      setNomeProfissional(existingSigs.enfermeiro?.nome || localStorage.getItem('last_prof_name_enf') || 'Enfª. Alessandra de Sousa');
      setRegistroProfissional(existingSigs.enfermeiro?.registro || localStorage.getItem('last_prof_reg_enf') || 'COREN-MG 312450');
    }

    setTimeout(() => {
      initCanvas();
    }, 50);
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
    strokesCountRef.current += 1;

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

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const isBlue = checkIsBlueLayout();
    ctx.strokeStyle = isBlue ? '#ffffff' : '#084b44';
    ctx.lineWidth = 2.8;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    strokesCountRef.current += 1;
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
    strokesCountRef.current = 0;
  };

  // Exporta a assinatura em formato PNG nítido e transparente com tinta médica escura
  const exportCleanSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = 380;
      offscreen.height = 110;
      const octx = offscreen.getContext('2d');

      // Desenha o canvas original redimensionado no offscreen
      octx.drawImage(canvas, 0, 0, 380, 110);

      // Lê pixels para garantir fundo transparente e tinta sólida
      const imgData = octx.getImageData(0, 0, 380, 110);
      const d = imgData.data;
      const bgR = d[0], bgG = d[1], bgB = d[2];
      let hasInk = false;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        const y = Math.floor((i / 4) / 380);
        const isGuide = y >= 82;

        if (a > 30 && diff > 35 && !isGuide) {
          hasInk = true;
          // Cor escura de caneta (#084b44)
          d[i] = 8;
          d[i + 1] = 75;
          d[i + 2] = 68;
          d[i + 3] = 255;
        } else {
          // Fundo transparente
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0;
          d[i + 3] = 0;
        }
      }

      if (hasInk) {
        octx.putImageData(imgData, 0, 0);
        return offscreen.toDataURL('image/png');
      }
    } catch (e) {
      console.error('Erro na extração de assinatura:', e);
    }

    // Se o usuário não desenhou no canvas, gera a rubrica certificada oficial automaticamente
    return generateCertifiedStampPng({
      nome: nomeProfissional.trim(),
      cargo: tipoProfissional === 'MEDICO' ? 'Médico Nefrologista / RT da Unidade de TRS' : 'Enfermeiro(a) RT da Hemodiálise',
      registro: registroProfissional.trim(),
      dataHora: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      hash: 'AUTO',
    });
  };

  const handleRemoverAssinatura = (tipo) => {
    if (!window.confirm(`Deseja remover a assinatura de ${tipo === 'MEDICO' ? 'Médico' : 'Enfermeiro'} de todos os pacientes deste mês?`)) {
      return;
    }
    removeProfessionalSignature(mesAno, paciente?.cd_paciente, tipo);
    const updated = getProfessionalSignatures(mesAno, paciente?.cd_paciente);
    setExistingSigs(updated);
    if (onSaved) onSaved(updated);
  };

  const handleSubmit = (andPrint = false) => {
    setErrorMessage(null);

    if (!nomeProfissional.trim()) {
      setErrorMessage('Por favor, informe o Nome Completo do Responsável Técnico.');
      return;
    }

    if (!registroProfissional.trim()) {
      setErrorMessage(`Por favor, informe o registro profissional (${tipoProfissional === 'MEDICO' ? 'CRM-MG' : 'COREN-MG'}).`);
      return;
    }

    if (!termoAceito) {
      setErrorMessage('É obrigatório confirmar o atesto legal das sessões sob a Portaria SAS/MS nº 706/2014 e RDC Anvisa nº 11/2014.');
      return;
    }

    let imagemFinal = null;
    if (modoAssinatura === 'CANVAS') {
      imagemFinal = exportCleanSignature();
    } else {
      imagemFinal = generateCertifiedStampPng({
        nome: nomeProfissional.trim(),
        cargo: tipoProfissional === 'MEDICO' ? 'Médico Nefrologista / RT da Unidade de TRS' : 'Enfermeiro(a) RT da Hemodiálise',
        registro: registroProfissional.trim(),
        dataHora: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        hash: 'CERT',
      });
    }

    // Persiste preferências no navegador para os próximos acessos
    if (tipoProfissional === 'MEDICO') {
      localStorage.setItem('last_prof_name_medico', nomeProfissional.trim());
      localStorage.setItem('last_prof_reg_medico', registroProfissional.trim());
    } else {
      localStorage.setItem('last_prof_name_enf', nomeProfissional.trim());
      localStorage.setItem('last_prof_reg_enf', registroProfissional.trim());
    }

    try {
      const updatedSigs = saveProfessionalSignature({
        mesAno,
        cdPaciente: paciente?.cd_paciente,
        tipoProfissional,
        nome: nomeProfissional.trim(),
        registro: registroProfissional.trim(),
        modoAssinatura,
        imagem: imagemFinal,
        applyToAll: true, // "Assinou um, assinou todos do mês"
        usuario: currentUser?.sub || currentUser?.login || 'SISTEMA',
      });

      if (onSaved) {
        onSaved(updatedSigs);
      }

      onClose();

      if (andPrint && onSaveAndPrint) {
        setTimeout(() => {
          onSaveAndPrint(paciente);
        }, 150);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao registrar assinatura profissional.');
    }
  };

  if (!isOpen || !paciente) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-fade-in tablet-signature-modal"
    >
      <div className="bg-white dark:bg-[#132438] rounded-xl shadow-2xl border border-slate-300 dark:border-[#2e537e] max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-200 dark:border-[#2e537e] bg-slate-50 dark:bg-[#1d3654] flex items-start justify-between gap-3 tsm-card-static">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 uppercase tracking-wider">
                Portaria SAS/MS nº 706/2014 & RDC Anvisa 11/2014
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                Competência: {nomeCompetencia}
              </span>
            </div>
            <h2 id={titleId} className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <MonochromeIcon name="pen" className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Assinatura de Responsável Técnico — CFID Mensal
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5">
              Paciente: <strong>{paciente.nome_paciente}</strong> (Cód: {paciente.cd_paciente})
              {paciente.nome_turma && ` • ${paciente.nome_turma}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Fechar janela"
          >
            ✕
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg bg-red-100 border border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Destaque da Regra: Assinou um, assinou todos do mês */}
          <div className="p-3 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50/80 dark:bg-[#17384e] text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚡</span>
              <div>
                <strong className="text-teal-950 dark:text-teal-200 text-xs block font-bold">
                  Função Ativa: Assinou um, assina todos do mês ({nomeCompetencia})
                </strong>
                <span className="text-[11px] text-teal-800 dark:text-teal-300">
                  Ao salvar a assinatura aqui, ela será aplicada automaticamente a <strong>todos os pacientes</strong> deste mês.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 dark:bg-teal-900 dark:text-teal-200 uppercase tracking-wide shrink-0">
              Automático
            </span>
          </div>

          {/* Assinaturas já existentes */}
          {(existingSigs.medico || existingSigs.enfermeiro) && (
            <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/60 dark:bg-[#17384e] dark:border-[#295b7f] text-xs space-y-2 tsm-card-static">
              <strong className="text-teal-900 dark:text-teal-300 block font-bold">
                ✓ Assinaturas já ativas para este mês:
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {existingSigs.medico && (
                  <div className="p-2 rounded bg-white dark:bg-[#0b1624] border border-teal-200 dark:border-teal-900 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{existingSigs.medico.nome}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{existingSigs.medico.registro || 'CRM-MG'}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Assinado: {existingSigs.medico.dataHora}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoverAssinatura('MEDICO')}
                      className="text-[10px] text-red-600 hover:text-red-800 dark:text-red-400 hover:underline ml-2"
                      title="Excluir assinatura do médico"
                    >
                      Remover
                    </button>
                  </div>
                )}
                {existingSigs.enfermeiro && (
                  <div className="p-2 rounded bg-white dark:bg-[#0b1624] border border-teal-200 dark:border-teal-900 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{existingSigs.enfermeiro.nome}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{existingSigs.enfermeiro.registro || 'COREN-MG'}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Assinado: {existingSigs.enfermeiro.dataHora}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoverAssinatura('ENFERMEIRO')}
                      className="text-[10px] text-red-600 hover:text-red-800 dark:text-red-400 hover:underline ml-2"
                      title="Excluir assinatura do enfermeiro"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Abas de Seleção de Papel Profissional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Selecione o conselho profissional do signatário:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTipo('MEDICO')}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tipoProfissional === 'MEDICO'
                    ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1d3654] dark:hover:bg-[#25446a] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#2e537e]'
                }`}
              >
                <span>🩺</span> Médico Nefrologista / RT (CRM-MG)
              </button>
              <button
                type="button"
                onClick={() => handleSelectTipo('ENFERMEIRO')}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tipoProfissional === 'ENFERMEIRO'
                    ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1d3654] dark:hover:bg-[#25446a] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#2e537e]'
                }`}
              >
                <span>💉</span> Enfermeiro(a) RT (COREN-MG)
              </button>
            </div>
          </div>

          {/* Dados do Signatário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#2e537e] bg-slate-50 dark:bg-[#1d3654] tsm-card-static">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Nome Completo do Profissional:
              </label>
              <input
                type="text"
                value={nomeProfissional}
                onChange={(e) => setNomeProfissional(e.target.value)}
                placeholder={tipoProfissional === 'MEDICO' ? 'Ex: Dr. Lucas Gusmão' : 'Ex: Enfª. Alessandra de Sousa'}
                className="w-full text-xs p-2 rounded border border-slate-300 dark:border-[#264366] bg-white dark:bg-[#0b1624] text-slate-900 dark:text-white tsm-field-writable"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Registro no Conselho ({tipoProfissional === 'MEDICO' ? 'CRM-MG' : 'COREN-MG'}):
              </label>
              <input
                type="text"
                value={registroProfissional}
                onChange={(e) => setRegistroProfissional(e.target.value)}
                placeholder={tipoProfissional === 'MEDICO' ? 'Ex: CRM-MG 12345' : 'Ex: COREN-MG 67890'}
                className="w-full text-xs p-2 rounded border border-slate-300 dark:border-[#264366] bg-white dark:bg-[#0b1624] text-slate-900 dark:text-white tsm-field-writable"
              />
            </div>
          </div>

          {/* Modalidade de Assinatura */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Forma de Assinatura:
            </label>
            <div className="flex gap-4 text-xs font-semibold mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sigMode"
                  checked={modoAssinatura === 'CANVAS'}
                  onChange={() => setModoAssinatura('CANVAS')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>✍️ Assinatura Manuscrita no Tablet / Mouse</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sigMode"
                  checked={modoAssinatura === 'CERTIFICADA'}
                  onChange={() => setModoAssinatura('CERTIFICADA')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>🛡️ Assinatura Eletrônica Certificada (Lei 14.063/2020)</span>
              </label>
            </div>

            {modoAssinatura === 'CANVAS' ? (
              <div className="border border-slate-300 dark:border-[#2e537e] rounded-lg p-2.5 bg-slate-50 dark:bg-[#1d3654] tsm-card-static">
                <div className="flex justify-between items-center mb-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <span>Assine com o dedo, caneta stylus ou mouse sobre a linha pontilhada:</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#25446a] hover:bg-slate-300 transition-colors text-xs"
                    title="Limpar assinatura"
                  >
                    Limpar
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-[#2e537e] tsm-canvas-wrapper shadow-inner bg-white dark:bg-[#0b1624]">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="w-full h-32 block touch-none cursor-crosshair"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50/70 dark:bg-[#0b1624] text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-300">
                  <span>🛡️ Carimbo e Assinatura Eletrônica Certificada (Lei nº 14.063/2020)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Será gerada uma rubrica oficial com carimbo institucional da Instituição de Saúde Modelo • Hospital de Referência Modelo, contendo o nome do profissional, conselho ({tipoProfissional === 'MEDICO' ? 'CRM-MG' : 'COREN-MG'}), data, hora e código de autenticidade criptográfica SHA-256 no documento CFID.
                </p>
              </div>
            )}
          </div>

          {/* Termo de Responsabilidade Legal (Portaria SAS/MS 706/2014) */}
          <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-[#17384e] text-xs">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termoAceito}
                onChange={(e) => setTermoAceito(e.target.checked)}
                className="mt-0.5 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-slate-700 dark:text-slate-200 leading-snug">
                <strong>Declaração e Atesto do Responsável Técnico:</strong> Declaro sob as penas da lei e para fins de comprovação e auditoria perante a Secretaria Municipal de Saúde de Belo Horizonte (SMSA-BH / SUS-BH), SES-MG e Ministério da Saúde (Portaria SAS/MS nº 706/2014 & RDC Anvisa nº 11/2014) a veracidade e a execução dos procedimentos de Hemodiálise constantes neste CFID.
              </span>
            </label>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-slate-200 dark:border-[#2e537e] bg-slate-50 dark:bg-[#1d3654] flex items-center justify-between gap-2 tsm-card-static">
          <Button variant="secondary" onClick={onClose} size="sm">
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(false)}
              className="text-teal-800 dark:text-teal-300 border-teal-600/50 hover:bg-teal-50 dark:hover:bg-teal-950/40"
            >
              Salvar Assinatura de Todos
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md"
            >
              <MonochromeIcon name="document" className="w-4 h-4 mr-1" />
              Salvar e Visualizar / Imprimir CFID
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalSignatureModal;
