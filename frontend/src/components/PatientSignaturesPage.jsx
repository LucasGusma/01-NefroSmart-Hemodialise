import MonochromeIcon from './MonochromeIcon';
import React, { useState, useEffect, useId, useCallback, useRef, useMemo } from 'react';
import Button from './Button';
import { apiFetch } from '../services/api';
import MonthlyAttendanceCalendar from './MonthlyAttendanceCalendar';
import TabletSignatureModal from './TabletSignatureModal';
import ViewSignatureModal from './ViewSignatureModal';
import InstallTabletModal from './InstallTabletModal';
import ProfessionalSignatureModal from './ProfessionalSignatureModal';
import {
  hasProfessionalSignature,
  getProfessionalBadgeText,
  getProfessionalSummary,
} from '../services/professionalSignatureService';
import { printSignatureAudit } from '../services/printSignatureAudit';
import { printCfidReport, printBatchCfidReport } from '../services/printCfidReport';
import {
  isPacienteAgendadoParaData,
  getTurnoPaciente,
  formatDateBR,
  formatDateLongBR
} from '../services/schedule';

const PatientSignaturesPage = ({ onBack, pacientes = [], onRefreshPacientes, currentUser }) => {
  const [dataSelecionada, setDataSelecionada] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [pacientesList, setPacientesList] = useState(pacientes);
  const [assinaturas, setAssinaturas] = useState([]);
  const [monthStats, setMonthStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [selectedTurnoFiltro, setSelectedTurnoFiltro] = useState('TODOS');
  const [filtroNome, setFiltroNome] = useState('');

  // Estados de Impressão e Relatórios CFID (Portaria SAS/MS nº 706/2014 & SMSA-BH)
  const [isPrintingAudit, setIsPrintingAudit] = useState(false);
  const [generatingCfidId, setGeneratingCfidId] = useState(null);
  const [showBatchCfidModal, setShowBatchCfidModal] = useState(false);
  const [batchMonth, setBatchMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isGeneratingBatchCfid, setIsGeneratingBatchCfid] = useState(false);
  const [batchCfidProgress, setBatchCfidProgress] = useState({ current: 0, total: 0 });

  // Modais
  const [signatureModal, setSignatureModal] = useState({
    isOpen: false,
    paciente: null,
    turno: null,
  });
  const [signatureModalError, setSignatureModalError] = useState(null);

  const [viewSignatureModal, setViewSignatureModal] = useState({
    isOpen: false,
    registro: null,
  });
  const [showInstallModal, setShowInstallModal] = useState(false);

  const [profSigModal, setProfSigModal] = useState({
    isOpen: false,
    paciente: null,
  });
  const [profSigVersion, setProfSigVersion] = useState(0);

  const pageTitleId = useId();
  const titleRef = useRef(null);

  // Reconhecimento do usuário MASTER (ADMIN ou perfil MASTER)
  const isMasterUser = useMemo(() => {
    if (currentUser) {
      const login = String(currentUser.login || currentUser.usuario || currentUser.sub || '').toUpperCase();
      if (login === 'ADMIN' || login === 'MASTER' || currentUser?.perfis?.includes('MASTER')) {
        return true;
      }
    }
    try {
      const u = JSON.parse(localStorage.getItem('userData') || '{}');
      const login = String(u.login || u.usuario || u.sub || '').toUpperCase();
      return login === 'ADMIN' || login === 'MASTER' || u?.perfis?.includes('MASTER');
    } catch (e) {
      return false;
    }
  }, [currentUser]);

  // Foco no título ao montar a página
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Mantém sincronizada a lista com a prop vinda do App
  useEffect(() => {
    if (Array.isArray(pacientes)) {
      setPacientesList(pacientes);
    }
  }, [pacientes]);

  // Busca sempre a lista de pacientes viva e atualizada do banco de dados
  const carregarPacientesVivos = useCallback(async () => {
    setLoadingPacientes(true);
    try {
      const res = await apiFetch('/api/pacientes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPacientesList(data);
        }
      }
    } catch (err) {
      // Mantém lista atual caso ocorra erro transitório
    } finally {
      setLoadingPacientes(false);
    }
  }, []);

  // Carrega ao montar e atualiza pacientes
  useEffect(() => {
    carregarPacientesVivos();
  }, [carregarPacientesVivos]);

  // Carregar assinaturas da data selecionada
  const carregarAssinaturas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/assinaturas?data=${dataSelecionada}`);
      if (res.ok) {
        const data = await res.json();
        setAssinaturas(Array.isArray(data) ? data : []);
      } else {
        setAssinaturas([]);
      }
    } catch (err) {
      setError('Erro ao carregar assinaturas.');
      setAssinaturas([]);
    } finally {
      setLoading(false);
    }
  }, [dataSelecionada]);

  // Carregar estatísticas do mês para alimentar os badges do calendário
  const carregarEstatisticasMes = useCallback(async () => {
    const mes = dataSelecionada.slice(0, 7);
    try {
      const res = await apiFetch(`/api/assinaturas/estatisticas-mes?mes=${mes}`);
      if (res.ok) {
        const data = await res.json();
        setMonthStats(data.por_dia || {});
        try { window.dispatchEvent(new CustomEvent('nefrosmart:signatures-changed')); } catch (_) {}
      }
    } catch (err) {
      // Ignora erro em estatísticas secundárias
    }
  }, [dataSelecionada]);

  useEffect(() => {
    carregarAssinaturas();
    carregarEstatisticasMes();
  }, [carregarAssinaturas, carregarEstatisticasMes]);

  // Mapa rápido de assinaturas registradas indexadas por cd_paciente
  const assinaturasPorPaciente = useMemo(() => {
    const map = new Map();
    assinaturas.forEach((ass) => {
      map.set(String(ass.cd_paciente), ass);
    });
    return map;
  }, [assinaturas]);

  // Lista de pacientes programados para a data selecionada:
  // Todos os pacientes cuja escala/dia bate com o dia selecionado entram AUTOMATICAMENTE na lista
  const pacientesDoDia = useMemo(() => {
    const lista = [];
    const pacientesAdicionados = new Set();

    // 1. Pacientes cadastrados cuja escala regular cai na data selecionada
    pacientesList.forEach((p) => {
      if (isPacienteAgendadoParaData(p, dataSelecionada)) {
        lista.push(p);
        pacientesAdicionados.add(String(p.cd_paciente));
      }
    });

    // 2. Pacientes que já possuem assinatura registrada na data (caso de reposição de sessão)
    assinaturas.forEach((ass) => {
      const codStr = String(ass.cd_paciente);
      if (!pacientesAdicionados.has(codStr)) {
        const pacienteCadastrado = pacientesList.find(
          (p) => String(p.cd_paciente) === codStr
        );
        if (pacienteCadastrado) {
          lista.push(pacienteCadastrado);
        } else {
          lista.push({
            cd_paciente: ass.cd_paciente,
            nome_paciente: ass.nome_paciente || `Paciente ${ass.cd_paciente}`,
            nome_turma: ass.horario_desc || 'Sessão Registrada',
            sn_ativo: 'S',
          });
        }
        pacientesAdicionados.add(codStr);
      }
    });

    // Ordenação alfabética por nome do paciente
    return lista.sort((a, b) =>
      (a.nome_paciente || '').localeCompare(b.nome_paciente || '', 'pt-BR')
    );
  }, [pacientesList, dataSelecionada, assinaturas]);

  // Contagem de pacientes por turno no dia
  const contagemPorTurno = useMemo(() => {
    const counts = { '1': 0, '2': 0, '3': 0, 'TODOS': pacientesDoDia.length };
    pacientesDoDia.forEach((p) => {
      const turno = getTurnoPaciente(p);
      if (turno?.id && counts[turno.id] !== undefined) {
        counts[turno.id]++;
      }
    });
    return counts;
  }, [pacientesDoDia]);

  // Filtragem por Turno e por Texto de Busca
  const pacientesFiltrados = useMemo(() => {
    return pacientesDoDia.filter((p) => {
      const turno = getTurnoPaciente(p);
      const assinatura = assinaturasPorPaciente.get(String(p.cd_paciente));

      // Filtro de turno selecionado
      if (selectedTurnoFiltro !== 'TODOS') {
        const turnoIdDoRegistro = assinatura?.horario_id || turno.id;
        if (String(turnoIdDoRegistro) !== String(selectedTurnoFiltro)) {
          return false;
        }
      }

      // Filtro de pesquisa rápida (nome ou código)
      if (filtroNome.trim()) {
        const termo = filtroNome.toLowerCase();
        const nomeMatch = (p.nome_paciente || '').toLowerCase().includes(termo);
        const codMatch = String(p.cd_paciente).includes(termo);
        return nomeMatch || codMatch;
      }

      return true;
    });
  }, [pacientesDoDia, selectedTurnoFiltro, filtroNome, assinaturasPorPaciente]);

  // Detecção de Dias Passados (Cinza Escuro) e Dias Futuros (Fechado para assinatura)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const isPastDate = dataSelecionada < todayStr;
  const isFutureDate = dataSelecionada > todayStr;

  // Detecção de Último Dia do Mês (Para notificação de Fechamento de Competência)
  const isLastDayOfMonth = useMemo(() => {
    if (!dataSelecionada) return false;
    const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return dia === ultimoDia;
  }, [dataSelecionada]);

  // Controle de Abas: 'PRESENCA' (Marcar comparecimento) vs 'HISTORICO' (Auditoria médica)
  // Em dias passados ou futuros, fica fechado para usuários normais.
  // Para o usuário MASTER (ADMIN), todas as abas e datas ficam completamente LIBERADAS para ver e mudar!
  const [activeTabMode, setActiveTabMode] = useState(() => (isMasterUser ? 'PRESENCA' : (isPastDate || isFutureDate ? 'HISTORICO' : 'PRESENCA')));

  const isAuditMode = (!isMasterUser && (isPastDate || isFutureDate)) || activeTabMode === 'HISTORICO';

  useEffect(() => {
    if (!isMasterUser) {
      if (isPastDate || isFutureDate) {
        setActiveTabMode('HISTORICO');
      } else {
        setActiveTabMode('PRESENCA');
      }
    }
  }, [isPastDate, isFutureDate, isMasterUser]);

  // Métricas do Dia Selecionado
  const totalAgendadosDia = pacientesDoDia.length;
  const totalComparecidosDia = pacientesDoDia.filter((p) =>
    assinaturasPorPaciente.has(String(p.cd_paciente))
  ).length;
  const totalNaoComparecidosDia = Math.max(0, totalAgendadosDia - totalComparecidosDia);
  const percentualComparecimento = totalAgendadosDia > 0
    ? Math.round((totalComparecidosDia / totalAgendadosDia) * 100)
    : 0;

  // Abrir modal para verificar assinatura do paciente (mesmo que não tenha comparecido)
  const handleVerificarAssinatura = useCallback((paciente, assinaturaExistente) => {
    const turnoInfo = getTurnoPaciente(paciente);
    if (assinaturaExistente) {
      setViewSignatureModal({
        isOpen: true,
        registro: {
          ...assinaturaExistente,
          isPastDate,
          isMaster: isMasterUser,
        },
      });
    } else {
      setViewSignatureModal({
        isOpen: true,
        registro: {
          cd_paciente: paciente.cd_paciente,
          nome_paciente: paciente.nome_paciente,
          data: dataSelecionada,
          horario_desc: turnoInfo.nome,
          status: 'NÃO COMPARECIDO',
          sn_assinado: 'N',
          assinatura_base64: null,
          hora_registro: null,
          dt_registro: null,
          isPastDate,
          isMaster: isMasterUser,
        },
      });
    }
  }, [dataSelecionada, isPastDate, isMasterUser]);

  // Ao clicar em "Marcar Comparecido": abre imediatamente o tablet com a caneta (apenas no dia da sessão ou MASTER)
  const handleAbrirAssinatura = (paciente) => {
    if (isFutureDate && !isMasterUser) {
      setError('As sessões dos dias seguintes estão fechadas para assinatura para que o paciente não assine mais de um dia por vez.');
      return;
    }
    const turnoPadrao = getTurnoPaciente(paciente);
    setSignatureModalError(null);
    setSignatureModal({
      isOpen: true,
      paciente,
      turno: turnoPadrao,
    });
  };

  // Confirmar e salvar assinatura coletada no tablet (Conforme Portaria SAS/MS 706/2014, RDC Anvisa 11/2014 Art. 35, Lei 14.063/2020 e SMSA-BH)
  const handleConfirmarAssinatura = async (confirmInput) => {
    const { paciente, turno } = signatureModal;
    if (!paciente) return;

    setIsSubmittingSignature(true);
    setSignatureModalError(null);
    setError(null);

    const isObj = confirmInput && typeof confirmInput === 'object';
    const signatureDataUrl = isObj
      ? (confirmInput.signatureDataUrl || confirmInput.assinatura_base64 || '')
      : String(confirmInput || '');

    const now = new Date();
    const snNovo = isObj ? (confirmInput.sn_dialisador_novo || 'N') : 'N';
    const payload = {
      cd_paciente: paciente.cd_paciente,
      nome_paciente: paciente.nome_paciente,
      data: dataSelecionada,
      horario_id: turno?.id || '1',
      horario_desc: turno?.nome || '1º Turno (Manhã)',
      turno: turno?.nome || 'Manhã',
      status: 'COMPARECIDO',
      sn_assinado: 'S',
      assinatura_base64: signatureDataUrl,
      hora_registro: now.toLocaleTimeString('pt-BR'),
      dt_registro: now.toLocaleString('pt-BR'),
      observacao: isObj ? (confirmInput.observacao || '') : '',
      sn_dialisador_novo: snNovo,
      lote_dialisador: isObj ? (confirmInput.lote_dialisador || '') : '',
      dt_primeiro_uso_dialisador: isObj
        ? (confirmInput.dt_primeiro_uso_dialisador || (snNovo === 'S' ? dataSelecionada : ''))
        : '',
      num_reuso: isObj ? Number(confirmInput.num_reuso ?? 0) : 0,
      tipo_assinante: isObj ? (confirmInput.tipo_assinante || 'PACIENTE') : 'PACIENTE',
      nome_responsavel: isObj ? (confirmInput.nome_responsavel || '') : '',
      doc_responsavel: isObj ? (confirmInput.doc_responsavel || '') : '',
      parentesco_responsavel: isObj ? (confirmInput.parentesco_responsavel || '') : '',
      motivo_responsavel: isObj ? (confirmInput.motivo_responsavel || '') : '',
      hora_inicio: isObj ? (confirmInput.hora_inicio || turno?.horarioPadrao || '06:00') : (turno?.horarioPadrao || '06:00'),
      hora_fim: isObj ? (confirmInput.hora_fim || '') : '',
      tipo_acesso: isObj ? (confirmInput.tipo_acesso || paciente.ds_acesso || 'FAV') : (paciente.ds_acesso || 'FAV'),
      intercorrencias: isObj ? (confirmInput.intercorrencias || 'SEM_INTERCORRENCIAS') : 'SEM_INTERCORRENCIAS',
      cd_procedimento_sus: isObj
        ? (confirmInput.cd_procedimento_sus || paciente.cd_procedimento_sus || '03.05.01.010-7')
        : (paciente.cd_procedimento_sus || '03.05.01.010-7'),
      cd_cid: isObj ? (confirmInput.cd_cid || paciente.cd_cid || 'N18.0') : (paciente.cd_cid || 'N18.0'),
      lgpd_consentimento: isObj ? (confirmInput.lgpd_consentimento || 'S') : 'S',
    };

    try {
      const res = await apiFetch('/api/assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(`Comparecimento e assinatura de ${paciente.nome_paciente} registrados com sucesso!`);
        setSignatureModal({ isOpen: false, paciente: null, turno: null });
        setSignatureModalError(null);
        setTimeout(() => setSuccess(''), 4000);
        await carregarAssinaturas();
        await carregarEstatisticasMes();
      } else {
        const errData = await res.json().catch(() => ({}));
        let msg = errData.error || `Erro ${res.status}: Não foi possível registrar a assinatura.`;
        if (res.status === 401 && (msg.toLowerCase().includes('expirada') || msg.toLowerCase().includes('inválido'))) {
          msg = 'Sua sessão expirou ou não foi reconhecida. Por favor, saia e faça login novamente no sistema.';
        }
        setSignatureModalError(msg);
        setError(msg);
      }
    } catch (err) {
      const msg = 'Erro de conexão ao salvar assinatura no banco.';
      setSignatureModalError(msg);
      setError(msg);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  // Desmarcar presença / Excluir assinatura
  const handleDesmarcarPresenca = async (recordId) => {
    if (!window.confirm('Deseja realmente desmarcar o comparecimento e remover a assinatura deste paciente?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/api/assinaturas/${recordId}`, { method: 'DELETE' });
      if (res.ok) {
        setViewSignatureModal({ isOpen: false, registro: null });
        setSuccess('Comparecimento desmarcado com sucesso.');
        setTimeout(() => setSuccess(''), 3000);
        await carregarAssinaturas();
        await carregarEstatisticasMes();
      } else {
        setError('Erro ao desmarcar presença.');
      }
    } catch (err) {
      setError('Erro de conexão ao desmarcar presença.');
    } finally {
      setLoading(false);
    }
  };

  // Impressão da Auditoria Diária de Assinaturas (Conforme normas SMSA-BH e Anvisa)
  const handlePrintAudit = async () => {
    setIsPrintingAudit(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/assinaturas?data=${dataSelecionada}`);
      let list = [];
      if (res.ok) {
        list = await res.json();
      }
      if (!Array.isArray(list) || list.length === 0) {
        list = assinaturas;
      }
      if (!list || list.length === 0) {
        if (window.confirm('Nenhuma assinatura digital foi registrada nesta data ainda.\nDeseja imprimir a Lista de Presença da Escala do Dia para coleta manual?')) {
          await printSignatureAudit(dataSelecionada, pacientesDoDia.map(p => ({
            cd_paciente: p.cd_paciente,
            nome_paciente: p.nome_paciente,
            horario_desc: getTurnoPaciente(p)?.nome || '',
            status: 'NÃO COMPARECIDO',
            sn_assinado: 'N',
            hora_registro: '--:--',
            usuario_registro: 'Sistema'
          })));
          setSuccess('Lista de presença gerada para impressão com sucesso!');
          setTimeout(() => setSuccess(''), 3000);
        }
        return;
      }
      await printSignatureAudit(dataSelecionada, list);
      setSuccess('Relatório de auditoria gerado para impressão com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erro ao preparar a impressão da auditoria.');
    } finally {
      setIsPrintingAudit(false);
    }
  };

  // Emissão do Documento CFID Individual (Portaria SAS/MS nº 706/2014)
  const handleGerarCfidIndividual = async (paciente) => {
    const mesAno = dataSelecionada.slice(0, 7);
    setGeneratingCfidId(paciente.cd_paciente);
    setError(null);
    try {
      const res = await apiFetch(`/api/assinaturas?mes=${mesAno}&cd_paciente=${paciente.cd_paciente}`);
      if (!res.ok) {
        throw new Error('Não foi possível carregar as sessões do paciente para o CFID.');
      }
      const sessoes = await res.json();
      await printCfidReport(paciente, mesAno, Array.isArray(sessoes) ? sessoes : []);
      setSuccess(`CFID de ${paciente.nome_paciente} gerado para impressão!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erro ao emitir documento CFID do paciente.');
    } finally {
      setGeneratingCfidId(null);
    }
  };

  // Abertura do Modal de Assinatura Profissional do Responsável Técnico (Médico / Enfermeiro)
  const handleAbrirAssinaturaProfissional = (paciente) => {
    setProfSigModal({
      isOpen: true,
      paciente,
    });
  };

  const handleProfSigSaved = () => {
    setProfSigVersion((v) => v + 1);
    setSuccess('Assinatura do Responsável Técnico registrada com sucesso no CFID!');
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleProfSigSaveAndPrint = async (paciente) => {
    setProfSigVersion((v) => v + 1);
    setSuccess('Assinatura registrada! Gerando documento CFID assinado...');
    await handleGerarCfidIndividual(paciente);
  };

  // Emissão Consolidada do Fechamento Mensal / CFID Total (Lote Completo)
  const handleGerarBatchCfid = async () => {
    if (!pacientesList || pacientesList.length === 0) {
      setError('Nenhum paciente cadastrado para gerar o fechamento mensal.');
      return;
    }
    setIsGeneratingBatchCfid(true);
    setError(null);
    setBatchCfidProgress({ current: 0, total: pacientesList.length });
    try {
      const res = await apiFetch(`/api/assinaturas?mes=${batchMonth}`);
      let todasAssinaturas = [];
      if (res.ok) {
        todasAssinaturas = await res.json();
      }
      if (!Array.isArray(todasAssinaturas)) todasAssinaturas = [];

      const assinaturasPorPacienteMes = new Map();
      todasAssinaturas.forEach((ass) => {
        const cod = String(ass.cd_paciente);
        if (!assinaturasPorPacienteMes.has(cod)) {
          assinaturasPorPacienteMes.set(cod, []);
        }
        assinaturasPorPacienteMes.get(cod).push(ass);
      });

      const pacientesComSessoes = pacientesList.map((p, idx) => {
        setBatchCfidProgress({ current: idx + 1, total: pacientesList.length });
        const sessoes = assinaturasPorPacienteMes.get(String(p.cd_paciente)) || [];
        return {
          paciente: p,
          registros: sessoes,
        };
      });

      await printBatchCfidReport(pacientesComSessoes, batchMonth);
      setShowBatchCfidModal(false);
      setSuccess(`Fechamento Mensal CFID (${batchMonth}) gerado com sucesso para ${pacientesList.length} pacientes!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Erro ao gerar lote consolidado do CFID.');
    } finally {
      setIsGeneratingBatchCfid(false);
    }
  };

  return (
    <div aria-labelledby={pageTitleId} className="patient-signatures-page pb-8">
      <div className="fp-panel-bg rounded-2xl shadow-xl w-full flex flex-col overflow-hidden border fp-border">
        
        {/* Topo Principal com a cor #40baab exata da marca */}
        <header className="p-4 sm:p-5 fp-selected-bg fp-text flex flex-wrap gap-4 justify-between items-center border-b fp-border">
          <div>
            <h2
              ref={titleRef}
              tabIndex={-1}
              id={pageTitleId}
              className="text-xl sm:text-2xl font-black flex items-center gap-2 outline-none fp-text"
            >
              <MonochromeIcon name="signature" className="fp-semantic-icon" /> Assinatura dos Pacientes - Hemodiálise
            </h2>
            <p className="text-xs fp-text font-semibold mt-1">
              Controle automático de presença por escala, turnos e coleta de assinatura em tablet.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão Fechamento Mensal CFID Total */}
            <button
              type="button"
              onClick={() => {
                setBatchMonth(dataSelecionada.slice(0, 7));
                setShowBatchCfidModal(true);
              }}
              className="px-3 py-2 text-xs font-bold fp-text fp-selected-bg hover:bg-[#065b53] border fp-border rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              title="Emitir CFID Consolidado de todos os pacientes no encerramento da competência (Portaria SAS/MS nº 706/2014 & SMSA-BH)"
            >
              <MonochromeIcon name="document" className="fp-semantic-icon" /> Fechamento Mensal (CFID Total)
            </button>

            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="px-3 py-2 text-xs font-bold fp-selection-text fp-selected-bg border fp-border hover:bg-[#d5f1eb] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              title="Como baixar ou instalar o aplicativo no tablet"
            >
              <MonochromeIcon name="tablet" className="fp-semantic-icon" /> Baixar no Tablet
            </button>
            <button
              type="button"
              onClick={() => {
                carregarPacientesVivos();
                carregarAssinaturas();
                carregarEstatisticasMes();
                if (onRefreshPacientes) onRefreshPacientes();
              }}
              className="px-3 py-2 text-xs font-bold fp-selection-text fp-panel-bg border fp-border hover:bg-[#f0faf8] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              title="Atualizar lista de pacientes do banco"
            >
              <MonochromeIcon name="refresh" className="fp-semantic-icon" /> Atualizar Pacientes
            </button>
            <Button onClick={onBack}>Voltar aos pacientes</Button>
          </div>
        </header>

        {/* Notificação Exclusiva Master */}
        {isMasterUser && (
          <div className="mx-4 mt-3 p-2.5 fp-warning-bg border fp-border rounded-xl text-xs font-bold fp-warning-text flex items-center gap-2">
            <MonochromeIcon name="shield" className="fp-semantic-icon" />
            <span>
              Acesso Master (ADMIN) — Edição Total Liberada (Qualquer data passada ou futura desbloqueada para assinatura, alteração e exclusão).
            </span>
          </div>
        )}

        {/* Notificação de Último Dia do Mês */}
        {isLastDayOfMonth && (
          <div className="mx-4 mt-2 p-3 fp-confirm-bg border fp-border rounded-xl text-xs fp-selection-text flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MonochromeIcon name="calendar" className="fp-semantic-icon" />
              <span>
                <strong>Último dia do mês:</strong> Fechamento da competência mensal. Você pode emitir o CFID Total de todos os pacientes para auditoria e faturamento SUS/APAC.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBatchMonth(dataSelecionada.slice(0, 7));
                setShowBatchCfidModal(true);
              }}
              className="px-2.5 py-1 text-xs font-bold fp-text fp-selected-bg hover:bg-[#065b53] rounded-md transition-colors whitespace-nowrap ml-2"
            >
              Emitir CFID Total
            </button>
          </div>
        )}

        {/* Alertas de Notificação */}
        {error && (
          <div className="mx-4 mt-3 p-3 fp-error-bg border fp-border fp-error-text rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold fp-error-text">✕</button>
          </div>
        )}
        {success && (
          <div className="mx-4 mt-3 p-3 fp-selected-bg border fp-border fp-selection-text rounded-lg text-sm font-semibold flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="font-bold fp-selection-text">✕</button>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Seção 1: Calendário Mensal com Dias Passados em Cinza Escuro */}
          <section aria-label="Calendário mensal de sessões">
            <MonthlyAttendanceCalendar
              selectedDate={dataSelecionada}
              onSelectDate={(novaData) => setDataSelecionada(novaData)}
              monthStats={monthStats}
            />
          </section>

          {/* Seção 2: Painel de Presença do Dia Selecionado */}
          <section className="fp-field-bg rounded-2xl border fp-border p-4 sm:p-6 shadow-xs space-y-5">
            
            {/* Cabeçalho do Dia */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b fp-border pb-4">
              <div>
                <span className="text-xs font-bold fp-selection-text uppercase tracking-wider block">
                  Lista de Presença Automática
                </span>
                <h3 className="text-xl sm:text-2xl font-black fp-text flex items-center gap-2">
                  <MonochromeIcon name="calendar" className="fp-semantic-icon" /> {formatDateLongBR(dataSelecionada)}
                </h3>
                <small className="text-xs fp-muted">
                  Pacientes escalados para este dia carregados automaticamente com base na escala (data e hora).
                </small>
              </div>

              {/* Status de Sincronização e Indicador de Histórico */}
              <div className="flex items-center gap-2 flex-wrap">
                {isPastDate && !isMasterUser && (
                  <span className="px-3 py-1 fp-neutral-bg fp-text rounded-lg text-xs font-bold border fp-border flex items-center gap-1.5">
                    <MonochromeIcon name="folder" className="fp-semantic-icon" /> Histórico Fechado ({formatDateBR(dataSelecionada)})
                  </span>
                )}
                {isFutureDate && !isMasterUser && (
                  <span className="px-3 py-1 fp-warning-bg fp-warning-text rounded-lg text-xs font-bold border fp-border flex items-center gap-1.5">
                    <MonochromeIcon name="lock" className="fp-semantic-icon" /> Sessão Futura Fechada ({formatDateBR(dataSelecionada)})
                  </span>
                )}
                {isMasterUser && (isPastDate || isFutureDate) && (
                  <span className="px-3 py-1 fp-warning-bg fp-warning-text rounded-lg text-xs font-bold border fp-border flex items-center gap-1.5">
                    <MonochromeIcon name="shield" className="fp-semantic-icon" /> Liberado Master ({formatDateBR(dataSelecionada)})
                  </span>
                )}
                <div className="flex items-center gap-2 text-xs fp-selection-text font-semibold fp-selected-bg px-3 py-1.5 rounded-lg border fp-border">
                  <span>✓</span> {pacientesList.length} pacientes ativos cadastrados no sistema
                </div>
              </div>
            </div>

            {/* Abas Principais: Marcar Comparecimento vs Histórico & Auditoria */}
            <div className="flex flex-wrap items-center justify-between gap-3 fp-panel-bg p-2.5 rounded-xl border fp-border">
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Aba 1: Marcar Comparecimento */}
                <button
                  type="button"
                  disabled={!isMasterUser && (isPastDate || isFutureDate)}
                  onClick={() => setActiveTabMode('PRESENCA')}
                  aria-pressed={activeTabMode === 'PRESENCA'}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                    !isMasterUser && (isPastDate || isFutureDate)
                      ? 'fp-field-bg fp-muted border fp-border cursor-not-allowed opacity-80'
                      : activeTabMode === 'PRESENCA'
                        ? 'fp-selected-bg fp-text shadow-xs font-black'
                        : 'fp-field-bg fp-selection-text hover:bg-[#e1f4ef] border fp-border'
                  }`}
                  title={
                    isPastDate && !isMasterUser
                      ? 'Aba trancada: este dia já passou e não permite marcar presença retroativa'
                      : isFutureDate && !isMasterUser
                        ? 'Aba fechada: as sessões dos dias seguintes ficam fechadas para evitar assinaturas antecipadas'
                        : 'Aba aberta para marcar comparecimento e coletar assinatura no tablet'
                  }
                >
                  <MonochromeIcon name={!isMasterUser && (isPastDate || isFutureDate) ? 'lock' : 'signature'} className="fp-semantic-icon" />
                  <span>Marcar Comparecimento</span>
                  {isPastDate && !isMasterUser ? (
                    <span className="px-2 py-0.5 rounded-md fp-neutral-bg fp-text text-[10px] font-black uppercase tracking-wider">
                      Trancada
                    </span>
                  ) : isFutureDate && !isMasterUser ? (
                    <span className="px-2 py-0.5 rounded-md fp-warning-bg fp-warning-text text-[10px] font-black uppercase tracking-wider">
                      Fechada (Dia Futuro)
                    </span>
                  ) : null}
                </button>

                {/* Aba 2: Histórico & Auditoria */}
                <button
                  type="button"
                  onClick={() => setActiveTabMode('HISTORICO')}
                  aria-pressed={activeTabMode === 'HISTORICO'}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                    activeTabMode === 'HISTORICO'
                      ? 'fp-selected-bg fp-text shadow-xs font-black ring-2 ring-[#40baab]'
                      : 'fp-field-bg fp-text hover:bg-[#e1f4ef] border fp-border'
                  }`}
                  title="Aba de histórico e auditoria médica de comparecimento"
                >
                  <MonochromeIcon name="audit" className="fp-semantic-icon" />
                  <span>Histórico & Auditoria</span>
                  {isPastDate && (
                    <span className="px-2 py-0.5 rounded-md fp-selected-bg fp-text text-[10px] font-black uppercase tracking-wider">
                      Ativa (Dia Passado)
                    </span>
                  )}
                  {isFutureDate && (
                    <span className="px-2 py-0.5 rounded-md fp-warning-bg fp-warning-text text-[10px] font-black uppercase tracking-wider border fp-border">
                      Sessão Futura
                    </span>
                  )}
                </button>
              </div>

              {/* Status Explicativo para a Equipe */}
              <div className="text-xs">
                {isPastDate && !isMasterUser ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg fp-warning-bg fp-warning-text border fp-border font-semibold">
                    <MonochromeIcon name="lock" className="fp-semantic-icon" /> <strong>Aba Trancada:</strong> Modo de auditoria médica ativo. Exibindo comparecimentos e verificação de assinaturas.
                  </span>
                ) : isFutureDate && !isMasterUser ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg fp-warning-bg fp-warning-text border fp-border font-semibold">
                    <MonochromeIcon name="lock" className="fp-semantic-icon" /> <strong>Sessão Futura:</strong> Fechada para assinatura para que o paciente não assine mais de um dia por vez.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg fp-selected-bg fp-selection-text border fp-border font-semibold">
                    <span>●</span> {isMasterUser && (isPastDate || isFutureDate) ? 'Modo Master Ativo: Edição liberada para esta data.' : 'Sessão de hoje aberta para marcação e assinatura no tablet.'}
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Impressão de Auditoria Diária */}
            <div className="flex flex-wrap items-center justify-between gap-3 fp-panel-bg p-3 rounded-xl border fp-border">
              <div>
                <button
                  type="button"
                  onClick={handlePrintAudit}
                  disabled={isPrintingAudit}
                  className="px-4 py-2 text-xs font-bold fp-selection-text fp-panel-bg border fp-border hover:bg-[#f0faf8] rounded-lg shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                  title="Imprimir relatório diário consolidado de assinaturas de todos os turnos"
                >
                  <MonochromeIcon name="print" className="fp-semantic-icon" /> {isPrintingAudit ? 'Preparando impressão...' : 'Imprimir auditoria — lista'}
                </button>
                <p className="text-xs fp-muted mt-1">
                  Todas as assinaturas de {formatDateBR(dataSelecionada)}, de todos os turnos, uma abaixo da outra.
                  {assinaturas.length > 0 ? (
                    <span className="ml-1.5 font-bold fp-selection-text">
                      ({assinaturas.length} assinatura{assinaturas.length > 1 ? 's' : ''} registrada{assinaturas.length > 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="ml-1.5 fp-muted font-medium">
                      (Nenhuma assinatura coletada nesta data ainda)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Aviso especial em dias passados (cinza): Lista de presença e verificação de assinatura */}
            {isPastDate && !isMasterUser && (
              <div className="fp-field-bg border fp-border fp-text p-3 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonochromeIcon name="folder" className="fp-semantic-icon" />
                  <span>
                    <strong>Auditoria Médica ({formatDateBR(dataSelecionada)}):</strong> A aba de marcar comparecimento está trancada.
                    A pessoa responsável (médico) pode ver somente se a pessoa compareceu ou não e clicar em <strong>(verificar assinatura de paciente)</strong> na frente de qualquer nome.
                  </span>
                </div>
                <span className="px-2 py-0.5 fp-neutral-bg fp-text rounded text-[11px] font-black uppercase tracking-wider">
                  Somente Leitura
                </span>
              </div>
            )}

            {/* Aviso especial em dias futuros: Sessão fechada para assinatura antecipada */}
            {isFutureDate && !isMasterUser && (
              <div className="fp-warning-bg border fp-border fp-warning-text p-3 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonochromeIcon name="lock" className="fp-semantic-icon" />
                  <span>
                    <strong>Sessão Futura ({formatDateBR(dataSelecionada)}):</strong> As sessões dos dias seguintes ficam <strong>fechadas para assinatura</strong> para evitar que o paciente assine mais de um dia por vez. A lista de presença será liberada no dia da sessão.
                  </span>
                </div>
                <span className="px-2 py-0.5 fp-warning-bg fp-warning-text rounded text-[11px] font-black uppercase tracking-wider">
                  Fechada
                </span>
              </div>
            )}

            {/* Cards de Métricas do Dia (Adaptados para Passado vs Hoje) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="fp-panel-bg p-3.5 rounded-xl border fp-border shadow-xs">
                <span className="text-xs fp-selection-text font-bold uppercase block">
                  {isPastDate ? 'Escalados na Data' : 'Escalados Hoje'}
                </span>
                <span className="text-2xl font-black fp-text">{totalAgendadosDia}</span>
                <small className="text-[11px] fp-muted block">
                  {isPastDate ? 'Total agendado' : 'Total do dia'}
                </small>
              </div>

              <div className="fp-panel-bg p-3.5 rounded-xl border fp-border shadow-xs">
                <span className="text-xs fp-selection-text font-bold uppercase block">Comparecidos</span>
                <span className="text-2xl font-black fp-selection-text flex items-center gap-1">
                  <span>✓</span> {totalComparecidosDia}
                </span>
                <small className="text-[11px] fp-selection-text font-bold block">
                  {percentualComparecimento}% de presença
                </small>
              </div>

              <div className="fp-panel-bg p-3.5 rounded-xl border fp-border shadow-xs">
                <span className="text-xs fp-warning-text font-bold uppercase block">
                  {isPastDate ? 'Ausências Registradas' : 'Não Comparecidos'}
                </span>
                <span className="text-2xl font-black fp-warning-text">{totalNaoComparecidosDia}</span>
                <small className="text-[11px] fp-muted block">
                  {isPastDate ? 'Sem presença no histórico' : 'Aguardando assinatura'}
                </small>
              </div>

              <div className="fp-panel-bg p-3.5 rounded-xl border fp-border shadow-xs">
                <span className="text-xs fp-selection-text font-bold uppercase block">Data Selecionada</span>
                <span className="text-lg font-bold fp-text block fp-date-value">{formatDateBR(dataSelecionada)}</span>
                <small className="text-[11px] fp-muted block">
                  {isPastDate && !isMasterUser ? '🔒 Histórico Trancado' : 'Sessão ambulatorial'}
                </small>
              </div>
            </div>

            {/* Barra de Seleção de Turno e Busca Rápida */}
            <div className="flex flex-wrap items-center justify-between gap-3 fp-panel-bg p-3 rounded-xl border fp-border">
              
              {/* Abas dos Turnos com contagem automática */}
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por turno">
                <button
                  type="button"
                  onClick={() => setSelectedTurnoFiltro('TODOS')}
                  aria-pressed={selectedTurnoFiltro === 'TODOS'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    selectedTurnoFiltro === 'TODOS'
                      ? 'fp-selected-bg fp-text shadow-xs font-black border fp-border'
                      : 'fp-field-bg fp-selection-text hover:bg-[#e1f4ef] border fp-border'
                  }`}
                >
                  <MonochromeIcon name="audit" className="fp-semantic-icon" /> Todos os Turnos
                  <span className="ml-1 px-1.5 py-0.2 fp-neutral-bg rounded-full text-[11px]">
                    {contagemPorTurno.TODOS}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTurnoFiltro('1')}
                  aria-pressed={selectedTurnoFiltro === '1'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    selectedTurnoFiltro === '1'
                      ? 'fp-selected-bg fp-text shadow-xs font-black'
                      : 'fp-field-bg fp-selection-text hover:bg-[#e1f4ef] border fp-border'
                  }`}
                >
                  <MonochromeIcon name="theme" className="fp-semantic-icon" /> 1º Turno (Manhã)
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] ${
                    selectedTurnoFiltro === '1' ? 'fp-neutral-bg fp-text' : 'fp-selected-bg fp-selection-text'
                  }`}>
                    {contagemPorTurno['1']}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTurnoFiltro('2')}
                  aria-pressed={selectedTurnoFiltro === '2'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    selectedTurnoFiltro === '2'
                      ? 'fp-selected-bg fp-text shadow-xs font-black'
                      : 'fp-field-bg fp-selection-text hover:bg-[#e1f4ef] border fp-border'
                  }`}
                >
                  <MonochromeIcon name="theme" className="fp-semantic-icon" /> 2º Turno (Tarde)
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] ${
                    selectedTurnoFiltro === '2' ? 'fp-neutral-bg fp-text' : 'fp-selected-bg fp-selection-text'
                  }`}>
                    {contagemPorTurno['2']}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTurnoFiltro('3')}
                  aria-pressed={selectedTurnoFiltro === '3'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    selectedTurnoFiltro === '3'
                      ? 'fp-selected-bg fp-text shadow-xs font-black'
                      : 'fp-field-bg fp-selection-text hover:bg-[#e1f4ef] border fp-border'
                  }`}
                >
                  <MonochromeIcon name="moon" className="fp-semantic-icon" /> 3º Turno (Noite)
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] ${
                    selectedTurnoFiltro === '3' ? 'fp-neutral-bg fp-text' : 'fp-selected-bg fp-selection-text'
                  }`}>
                    {contagemPorTurno['3']}
                  </span>
                </button>
              </div>

              {/* Campo de Pesquisa Rápida */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Localizar na lista do dia..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="w-full px-3.5 py-1.5 border fp-border rounded-full text-xs sm:text-sm fp-field-bg focus:outline-none focus:border-[#40baab] focus:ring-1 focus:ring-[#40baab]"
                />
              </div>
            </div>

            {/* Tabela de Presença dos Pacientes Pré-Carregados */}
            <div className="fp-panel-bg rounded-xl border fp-border shadow-xs overflow-hidden">
              {loading || loadingPacientes ? (
                <div className="py-12 text-center fp-selection-text">
                  <MonochromeIcon name="clock" className="fp-semantic-icon" />
                  Carregando lista de presença dos pacientes...
                </div>
              ) : pacientesFiltrados.length === 0 ? (
                <div className="py-12 text-center fp-muted italic">
                  <MonochromeIcon name="audit" className="fp-semantic-icon" />
                  Nenhum paciente escalado para esta data ou turno selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="fp-selected-bg fp-text font-black border-b fp-border text-xs uppercase tracking-wider">
                        <th className="p-3 w-16 whitespace-nowrap">Cód.</th>
                        <th className="p-3">Paciente</th>
                        <th className="p-3 whitespace-nowrap">Escala / Horário</th>
                        <th className="p-3 whitespace-nowrap">Turno</th>
                        <th className="p-3 text-center whitespace-nowrap">Status Presença</th>
                        <th className="p-3 text-right whitespace-nowrap">{isAuditMode ? 'Histórico & Auditoria' : 'Ação do Médico / Tablet'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e1e9e7]">
                      {pacientesFiltrados.map((paciente) => {
                        const turnoInfo = getTurnoPaciente(paciente);
                        const assinaturaRegistrada = assinaturasPorPaciente.get(
                          String(paciente.cd_paciente)
                        );
                        const compareceu = !!assinaturaRegistrada;

                        return (
                          <tr
                            key={paciente.cd_paciente}
                            className={`hover:bg-[#f6faf9] transition-colors ${
                              compareceu ? 'fp-field-bg' : ''
                            }`}
                          >
                            {/* Código */}
                            <td className="p-3 font-mono text-xs font-semibold fp-muted">
                              {paciente.cd_paciente}
                            </td>

                            {/* Paciente */}
                            <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                              {/* Linha 1: Nome do paciente e verificação de assinatura */}
                              <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                                <span className="font-bold fp-text whitespace-nowrap text-[13px]">
                                  {paciente.nome_paciente}
                                </span>
                                {/* Botão de Verificação */}
                                <button
                                  type="button"
                                  onClick={() => handleVerificarAssinatura(paciente, assinaturaRegistrada)}
                                  className="text-xs font-semibold fp-selection-text hover:text-[#065b53] hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title={`Verificar assinatura de ${paciente.nome_paciente}`}
                                >
                                  (verificar assinatura de paciente)
                                </button>
                              </div>

                              {/* Linha 2: Em frente ao SUS - AMBULATORIO, as duas opções: CFID Mensal e Assinatura Médico ou Enfermeiro */}
                              <div className="flex items-center gap-2.5 flex-nowrap mt-1 whitespace-nowrap">
                                <small className="text-[11px] fp-selection-text font-semibold whitespace-nowrap">
                                  {paciente.nome_convenio || 'SUS - AMBULATORIO'}
                                </small>

                                {/* Botão de CFID Mensal Individual (Portaria 706/2014) */}
                                <button
                                  type="button"
                                  onClick={() => handleGerarCfidIndividual(paciente)}
                                  disabled={generatingCfidId === paciente.cd_paciente}
                                  className="text-[11px] font-bold fp-selection-text hover:text-emerald-950 fp-confirm-bg hover:bg-emerald-100 px-2 py-0.5 rounded border fp-border inline-flex items-center gap-1 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                                  title={`Imprimir CFID Mensal de ${paciente.nome_paciente} (Portaria SAS/MS nº 706/2014)`}
                                >
                                  <MonochromeIcon name="document" className="fp-semantic-icon" /> {generatingCfidId === paciente.cd_paciente ? 'Gerando CFID...' : 'CFID Mensal'}
                                </button>

                                {/* Botão de Assinatura Médico ou Enfermeiro RT (Portaria SAS/MS nº 706/2014 & RDC Anvisa 11/2014) */}
                                {(() => {
                                  const mesAnoAtual = dataSelecionada.slice(0, 7);
                                  const jaAssinado = Boolean(profSigVersion >= 0 && hasProfessionalSignature(mesAnoAtual, paciente.cd_paciente));
                                  const badgeTexto = getProfessionalBadgeText(mesAnoAtual, paciente.cd_paciente);
                                  const resumoTexto = getProfessionalSummary(mesAnoAtual, paciente.cd_paciente);

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirAssinaturaProfissional(paciente)}
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                                        jaAssinado
                                          ? 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800 shadow-sm'
                                          : 'fp-selection-text hover:text-emerald-950 fp-field-bg hover:bg-emerald-100 border-teal-600/40'
                                      }`}
                                      title={
                                        jaAssinado
                                          ? `CFID assinado por RT: ${resumoTexto}. Clique para visualizar, alterar ou adicionar outra assinatura.`
                                          : `Assinar documento CFID como Médico Nefrologista ou Enfermeiro RT de ${paciente.nome_paciente}`
                                      }
                                    >
                                      <MonochromeIcon name="signature" className="fp-semantic-icon" />
                                      {jaAssinado ? `✓ CFID Assinado (${badgeTexto})` : 'Assinatura Médico ou Enfermeiro'}
                                    </button>
                                  );
                                })()}
                              </div>
                            </td>

                            {/* Escala / Horário */}
                            <td className="p-3 text-xs fp-muted">
                              <span className="font-semibold block fp-text whitespace-nowrap">
                                {paciente.nome_turma || paciente.ds_turma || 'Escala Padrão'}
                              </span>
                              <span className="text-[11px] fp-muted whitespace-nowrap">
                                {turnoInfo.horarioPadrao ? `Horário: ${turnoInfo.horarioPadrao}` : ''}
                              </span>
                            </td>

                            {/* Turno */}
                            <td className="p-3 text-xs whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-md font-bold fp-selection-text fp-field-bg border fp-border whitespace-nowrap inline-block">
                                {assinaturaRegistrada?.horario_desc || turnoInfo.nome}
                              </span>
                            </td>

                            {/* Status de Presença */}
                            <td className="p-3 text-center whitespace-nowrap">
                              {compareceu ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 fp-selected-bg fp-selection-text rounded-full text-xs font-bold border fp-border whitespace-nowrap">
                                  <span>✓</span> Comparecido
                                </span>
                              ) : isFutureDate ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 fp-warning-bg fp-warning-text rounded-full text-xs font-medium border fp-border whitespace-nowrap">
                                  <MonochromeIcon name="clock" className="fp-semantic-icon" /> Agendado (Futuro)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 fp-neutral-bg fp-text rounded-full text-xs font-semibold whitespace-nowrap">
                                  <span>○</span> Não comparecido
                                </span>
                              )}
                            </td>

                            {/* Ação */}
                            <td className="p-3 text-right whitespace-nowrap">
                              {isFutureDate && !isMasterUser ? (
                                <span
                                  className="px-2.5 py-1 text-xs font-semibold fp-warning-text fp-warning-bg border fp-border rounded-lg inline-flex items-center gap-1 select-none"
                                  title="As sessões dos dias seguintes ficam fechadas para assinatura"
                                >
                                  <MonochromeIcon name="lock" className="fp-semantic-icon" /> Fechado (Sessão Futura)
                                </span>
                              ) : isAuditMode && !isMasterUser ? (
                                /* Em dias passados (cinza) ou modo histórico: a aba de marcar comparecimento fica trancada */
                                <button
                                  type="button"
                                  onClick={() => handleVerificarAssinatura(paciente, assinaturaRegistrada)}
                                  className="px-2.5 py-1 text-xs font-bold fp-selection-text fp-field-bg border fp-border hover:bg-[#e1f4ef] rounded-lg transition-colors inline-flex items-center gap-1 ml-auto"
                                  title={`Verificar assinatura de ${paciente.nome_paciente}`}
                                >
                                  <MonochromeIcon name="search" className="fp-semantic-icon" /> Verificar assinatura de paciente
                                </button>
                              ) : compareceu ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleVerificarAssinatura(paciente, assinaturaRegistrada)}
                                    className="px-2.5 py-1 text-xs font-bold fp-selection-text fp-field-bg border fp-border hover:bg-[#e1f4ef] rounded-lg transition-colors flex items-center gap-1"
                                    title="Ver assinatura e comprovante"
                                  >
                                    <MonochromeIcon name="search" className="fp-semantic-icon" /> Verificar assinatura de paciente
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDesmarcarPresenca(assinaturaRegistrada.id)}
                                    className="fp-muted hover:text-rose-600 text-xs p-1"
                                    title="Desmarcar presença"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirAssinatura(paciente)}
                                  className="px-3.5 py-1.5 text-xs font-bold fp-text fp-selected-bg hover:bg-[#06675e] active:bg-[#05534b] rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto border fp-border"
                                  title="Marcar como comparecido e coletar assinatura no tablet"
                                >
                                  <MonochromeIcon name="signature" className="fp-semantic-icon" /> Marcar Comparecido {isMasterUser && (isPastDate || isFutureDate) ? '[MASTER]' : ''}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </section>

          {/* Seção 3: Informação Legal e Guarda Permanente (Federal, Minas Gerais e Belo Horizonte) */}
          <section className="fp-field-bg border fp-border rounded-xl p-4 text-xs fp-text flex items-start gap-3">
            <MonochromeIcon name="shield" className="fp-semantic-icon" />
            <div className="space-y-1.5">
              <strong className="fp-selection-text font-bold block">
                Preservação e Guarda Vitalícia no Banco de Dados — Conformidade Legal (Federal • Minas Gerais • Belo Horizonte):
              </strong>
              <p className="fp-muted">
                Em estrita conformidade com a <strong>Portaria SAS/MS nº 706/2014</strong> e <strong>Portaria GM/MS nº 1.675/2018</strong> (Controle de Frequência Individual de Tratamento Dialítico — CFID para faturamento APAC/TRS), <strong>RDC Anvisa nº 11/2014 (Art. 35 e Parágrafo Único)</strong> (apresentação e assinatura do paciente no primeiro uso de novo dialisador e rastreabilidade de reúso), <strong>Lei Federal nº 14.063/2020</strong> (assinaturas eletrônicas em saúde com integridade criptográfica SHA-256), <strong>Art. 595 do Código Civil</strong> (assinatura a rogo / responsável legal), <strong>Lei Federal nº 13.787/2018</strong>, <strong>Resoluções CFM nº 1.821/2007 e nº 2.299/2021</strong> (guarda mínima de 20 anos / guarda permanente vitalícia de prontuários eletrônicos) e <strong>Lei Federal nº 13.709/2018 (LGPD — Art. 11)</strong>.
              </p>
              <p className="fp-muted">
                <strong>Normas de Minas Gerais e Belo Horizonte:</strong> Atende integralmente ao <strong>Código de Saúde de Minas Gerais (Lei Estadual nº 13.317/1999 — SES-MG / VISA-MG)</strong>, ao <strong>Código Sanitário de Belo Horizonte (Lei Municipal nº 7.031/1996 — VISA-BH)</strong>, às diretrizes do <strong>CRM-MG</strong> e <strong>COREN-MG</strong>, e às normas de Controle, Avaliação e Auditoria Assistencial da <strong>Secretaria Municipal de Saúde de Belo Horizonte (SMSA-BH / SUS-BH — Gestão Plena)</strong>.
              </p>
            </div>
          </section>

        </div>

        {/* Rodapé com Botão Voltar */}
        <footer className="p-4 fp-field-bg border-t fp-border flex justify-end">
          <Button onClick={onBack}>Voltar aos pacientes</Button>
        </footer>

      </div>

      {/* Modal de Coleta de Assinatura no Tablet com Caneta */}
      {signatureModal.isOpen && (
        <TabletSignatureModal
          isOpen={signatureModal.isOpen}
          paciente={signatureModal.paciente}
          turno={signatureModal.turno}
          dataSelecionada={dataSelecionada}
          isSubmitting={isSubmittingSignature}
          errorMessage={signatureModalError}
          onConfirm={handleConfirmarAssinatura}
          onClose={() => {
            setSignatureModalError(null);
            setSignatureModal({ isOpen: false, paciente: null, turno: null });
          }}
        />
      )}

      {/* Modal de Visualização da Assinatura e Comprovante */}
      {viewSignatureModal.isOpen && (
        <ViewSignatureModal
          isOpen={viewSignatureModal.isOpen}
          registro={viewSignatureModal.registro}
          onClose={() => setViewSignatureModal({ isOpen: false, registro: null })}
          onDesmarcar={(!isPastDate || isMasterUser) ? handleDesmarcarPresenca : undefined}
          onColetarAssinatura={
            (!isPastDate || isMasterUser)
              ? (reg) => {
                  const paciente =
                    pacientesList.find(
                      (p) => String(p.cd_paciente) === String(reg.cd_paciente)
                    ) || reg;
                  setViewSignatureModal({ isOpen: false, registro: null });
                  handleAbrirAssinatura(paciente);
                }
              : undefined
          }
        />
      )}

      {/* Modal de Instruções e Instalação no Tablet */}
      <InstallTabletModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Modal de Fechamento Mensal / CFID Total (Lote Consolidado) */}
      {showBatchCfidModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-cfid-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="fp-panel-bg rounded-2xl shadow-2xl border fp-border w-full max-w-lg overflow-hidden flex flex-col">
            <header className="p-4 sm:p-5 fp-selected-bg fp-text flex justify-between items-center">
              <div>
                <h3 id="batch-cfid-title" className="text-base sm:text-lg font-black flex items-center gap-2">
                  <MonochromeIcon name="document" className="fp-semantic-icon" /> Fechamento Mensal — CFID Total
                </h3>
                <p className="text-xs text-[#a1dbd2] mt-0.5">
                  Dossiê consolidado para faturamento APAC e auditoria do SUS / SMSA-BH
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isGeneratingBatchCfid && setShowBatchCfidModal(false)}
                className="text-white/80 hover:text-white text-xl font-bold p-1"
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>

            <div className="p-5 space-y-4">
              <div className="fp-field-bg p-3 rounded-xl border fp-border text-xs fp-text">
                <p className="font-semibold fp-selection-text mb-1">
                  Conformidade com Portaria SAS/MS nº 706/2014 & Anvisa RDC nº 11/2014:
                </p>
                <p>
                  Gera o lote impresso contendo Folha de Rosto / Protocolo Institucional e a Folha Individual de CFID com todas as presenças, assinaturas digitais, dados do dialisador (novo/reúso) e Hash SHA-256 de integridade de cada paciente escalado na competência.
                </p>
              </div>

              <div>
                <label htmlFor="batch-competencia" className="block text-xs font-bold fp-text uppercase mb-1">
                  Competência de Fechamento (Mês/Ano):
                </label>
                <input
                  id="batch-competencia"
                  type="month"
                  value={batchMonth}
                  onChange={(e) => setBatchMonth(e.target.value)}
                  disabled={isGeneratingBatchCfid}
                  className="w-full px-3 py-2 border fp-border rounded-lg text-sm fp-panel-bg focus:outline-none focus:border-[#40baab]"
                />
              </div>

              {/* Status e Assinatura do Lote */}
              <div className="fp-field-bg p-3 rounded-lg border fp-border text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold fp-text">Assinatura de Responsável Técnico no Lote:</span>
                  <button
                    type="button"
                    disabled={isGeneratingBatchCfid}
                    onClick={() => {
                      const refPaciente = pacientesList[0] || { cd_paciente: 0, nome_paciente: 'Lote Consolidado' };
                      handleAbrirAssinaturaProfissional(refPaciente);
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded border border-teal-600/50 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 inline-flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <MonochromeIcon name="signature" className="w-3.5 h-3.5" />
                    Assinar Lote (Médico / Enfermeiro)
                  </button>
                </div>
                <div className="text-[11px] fp-muted">
                  {profSigVersion >= 0 && getProfessionalSummary(batchMonth, null)}
                </div>
              </div>

              <div className="fp-field-bg p-3 rounded-lg border fp-border text-xs fp-muted">
                <p><strong>Pacientes a processar:</strong> {pacientesList.length} pacientes ativos</p>
                <p className="mt-1">
                  O arquivo final consolida todos os pacientes em folhas A4 separadas prontas para arquivo físico ou exportação em PDF.
                </p>
              </div>

              {isGeneratingBatchCfid && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs fp-selection-text font-bold">
                    <span>Gerando dossiê de fechamento...</span>
                    <span>{batchCfidProgress.current} de {batchCfidProgress.total}</span>
                  </div>
                  <div className="w-full h-2 fp-neutral-bg rounded-full overflow-hidden">
                    <div
                      className="h-full fp-selected-bg transition-all duration-200"
                      style={{
                        width: `${batchCfidProgress.total ? (batchCfidProgress.current / batchCfidProgress.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <footer className="p-4 fp-field-bg border-t fp-border flex justify-end gap-2">
              <button
                type="button"
                disabled={isGeneratingBatchCfid}
                onClick={() => setShowBatchCfidModal(false)}
                className="px-4 py-2 text-xs font-bold fp-muted hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <Button
                type="button"
                disabled={isGeneratingBatchCfid}
                onClick={handleGerarBatchCfid}
                className="px-4 py-2 text-xs font-bold fp-text !fp-selected-bg hover:!bg-[#065b53] rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                {isGeneratingBatchCfid ? 'Gerando Lote...' : 'Imprimir / Salvar PDF do Lote'}
              </Button>
            </footer>
          </div>
        </div>
      )}
      {/* Modal de Assinatura Profissional do Responsável Técnico (Médico ou Enfermeiro) */}
      {profSigModal.isOpen && profSigModal.paciente && (
        <ProfessionalSignatureModal
          isOpen={profSigModal.isOpen}
          paciente={profSigModal.paciente}
          mesAno={dataSelecionada.slice(0, 7)}
          currentUser={currentUser}
          onClose={() => setProfSigModal({ isOpen: false, paciente: null })}
          onSaved={handleProfSigSaved}
          onSaveAndPrint={handleProfSigSaveAndPrint}
        />
      )}
    </div>
  );
};

export default PatientSignaturesPage;
