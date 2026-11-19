import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Button from './Button';
import SignaturePad from './SignaturePad';
import { apiFetch as fetch } from '../services/api';

const SHIFTS = [
  { id: 'turno1', label: '1º Horário (Manhã)', horario: '07:00 - 11:00', turmaPadrao: 'Manhã', icon: '☀️' },
  { id: 'turno2', label: '2º Horário (Tarde)', horario: '12:00 - 16:00', turmaPadrao: 'Tarde', icon: '🌤️' },
  { id: 'turno3', label: '3º Horário (Noite)', horario: '17:00 - 21:00', turmaPadrao: 'Noite', icon: '🌙' },
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function PatientSignaturesView({ onBack, pacientes = [] }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedShiftId, setSelectedShiftId] = useState('turno1');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signaturesMap, setSignaturesMap] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);

  // Carrega assinaturas salvas do backend e do localStorage
  const loadSignatures = useCallback(async () => {
    setIsLoadingSignatures(true);
    let localData = {};
    try {
      const stored = localStorage.getItem('nefrosmart_assinaturas');
      if (stored) localData = JSON.parse(stored);
    } catch (e) {
      console.warn('Erro ao ler assinaturas do localStorage:', e);
    }

    try {
      const response = await fetch('/api/assinaturas', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const remoteList = await response.json();
        remoteList.forEach(item => {
          if (item.id) localData[item.id] = item;
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar assinaturas da API, usando locais:', e);
    }

    setSignaturesMap(localData);
    const initialAttendance = {};
    Object.values(localData).forEach(item => {
      if (item.id && (item.comparecimento || item.assinatura)) {
        initialAttendance[item.id] = true;
      }
    });
    setAttendanceMap(initialAttendance);
    setIsLoadingSignatures(false);
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  // Determina se o paciente está escalado para o dia da semana
  const isPatientScheduledForDay = useCallback((patient, date) => {
    if (patient.sn_ativo && patient.sn_ativo !== 'S') return false;

    const dayOfWeek = date.getDay(); // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
    if (dayOfWeek === 0) return false; // Nao ha rotina normal aos domingos

    const turmaNome = (patient.nome_turma || '').toLowerCase();
    
    // Regras padrão de hemodiálise: Seg/Qua/Sex ou Ter/Qui/Sáb
    if (turmaNome.includes('seg') || turmaNome.includes('qua') || turmaNome.includes('sex') || turmaNome.includes('sqs')) {
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    }
    if (turmaNome.includes('ter') || turmaNome.includes('qui') || turmaNome.includes('sáb') || turmaNome.includes('sab') || turmaNome.includes('tqs')) {
      return dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;
    }

    // Se a turma nao especificar dias expressamente, distribui pelos dias pares/ímpares
    const id = Number(patient.cd_paciente) || 1;
    return (id % 2 === 0) ? (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6) : (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5);
  }, []);

  // Determina o horário/turno do paciente
  const getPatientShiftId = useCallback((patient) => {
    const turmaNome = (patient.nome_turma || '').toLowerCase();
    if (turmaNome.includes('tarde')) return 'turno2';
    if (turmaNome.includes('noite')) return 'turno3';
    if (turmaNome.includes('manhã') || turmaNome.includes('manha')) return 'turno1';

    // Distribuicao balanceada padrão por código do paciente caso nao haja turno explicito
    const id = Number(patient.cd_paciente) || 0;
    const modulo = id % 3;
    if (modulo === 1) return 'turno1';
    if (modulo === 2) return 'turno2';
    return 'turno3';
  }, []);

  // Todos os pacientes agendados para a data selecionada
  const dateKey = formatDateKey(selectedDate);

  const dayPatients = useMemo(() => {
    return pacientes.filter(p => isPatientScheduledForDay(p, selectedDate));
  }, [pacientes, selectedDate, isPatientScheduledForDay]);

  // Estatisticas gerais do dia selecionado
  const dayStats = useMemo(() => {
    let assinados = 0;
    let total = dayPatients.length;

    dayPatients.forEach(p => {
      const shiftId = getPatientShiftId(p);
      const recId = `${dateKey}_${shiftId}_${p.cd_paciente}`;
      if (signaturesMap[recId]?.assinatura) {
        assinados++;
      }
    });

    return {
      total,
      assinados,
      faltam: Math.max(0, total - assinados),
    };
  }, [dayPatients, dateKey, signaturesMap, getPatientShiftId]);

  // Pacientes do turno selecionado, ordenados estritamente em ordem alfabetica
  const shiftPatients = useMemo(() => {
    const list = dayPatients.filter(p => getPatientShiftId(p) === selectedShiftId);
    return list.slice().sort((a, b) => {
      const nameA = (a.nome_paciente || '').trim().toLowerCase();
      const nameB = (b.nome_paciente || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  }, [dayPatients, selectedShiftId, getPatientShiftId]);

  // Estatisticas por turno no dia selecionado
  const shiftStats = useMemo(() => {
    const stats = {};
    SHIFTS.forEach(shift => {
      const list = dayPatients.filter(p => getPatientShiftId(p) === shift.id);
      let assinados = 0;
      list.forEach(p => {
        const recId = `${dateKey}_${shift.id}_${p.cd_paciente}`;
        if (signaturesMap[recId]?.assinatura) assinados++;
      });
      stats[shift.id] = {
        total: list.length,
        assinados,
        faltam: Math.max(0, list.length - assinados),
      };
    });
    return stats;
  }, [dayPatients, dateKey, signaturesMap, getPatientShiftId]);

  // Calculo dos dias do calendario para o mes em visualizacao
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Espacos vazios anteriores ao 1º dia
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Dias do mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dKey = formatDateKey(dateObj);
      const isToday = formatDateKey(new Date()) === dKey;
      const isSelected = formatDateKey(selectedDate) === dKey;
      const dayPatientsList = pacientes.filter(p => isPatientScheduledForDay(p, dateObj));
      
      let signedCount = 0;
      dayPatientsList.forEach(p => {
        const shiftId = getPatientShiftId(p);
        const recId = `${dKey}_${shiftId}_${p.cd_paciente}`;
        if (signaturesMap[recId]?.assinatura) signedCount++;
      });

      days.push({
        day,
        date: dateObj,
        dateKey: dKey,
        isToday,
        isSelected,
        isSunday: dateObj.getDay() === 0,
        total: dayPatientsList.length,
        signed: signedCount,
        missing: Math.max(0, dayPatientsList.length - signedCount),
      });
    }
    return days;
  }, [viewDate, selectedDate, pacientes, signaturesMap, isPatientScheduledForDay, getPatientShiftId]);

  // Navegacao de meses
  const changeMonth = (offset) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
  };

  // Identificador do registro do paciente selecionado no turno e dia
  const currentRecordId = useMemo(() => {
    if (!selectedPatient) return null;
    return `${dateKey}_${selectedShiftId}_${selectedPatient.cd_paciente}`;
  }, [dateKey, selectedShiftId, selectedPatient]);

  const currentRecord = currentRecordId ? signaturesMap[currentRecordId] : null;
  const isComparecimentoChecked = Boolean(currentRecordId && (attendanceMap[currentRecordId] || currentRecord?.comparecimento));

  // Alterna o checkbox de comparecimento
  const handleToggleComparecimento = () => {
    if (!currentRecordId || !selectedPatient) return;
    const nextVal = !isComparecimentoChecked;
    const updatedAttendance = { ...attendanceMap, [currentRecordId]: nextVal };
    setAttendanceMap(updatedAttendance);

    // Atualiza registro local
    const existing = signaturesMap[currentRecordId] || {};
    const updated = {
      ...existing,
      id: currentRecordId,
      data: dateKey,
      cd_paciente: selectedPatient.cd_paciente,
      nome_paciente: selectedPatient.nome_paciente,
      horario_id: selectedShiftId,
      horario_label: SHIFTS.find(s => s.id === selectedShiftId)?.label || '',
      comparecimento: nextVal,
      data_registro: new Date().toISOString(),
    };

    const nextSignatures = { ...signaturesMap, [currentRecordId]: updated };
    setSignaturesMap(nextSignatures);
    localStorage.setItem('nefrosmart_assinaturas', JSON.stringify(nextSignatures));

    // Salva na API em segundo plano
    fetch('/api/assinaturas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updated)
    }).catch(err => console.warn('Erro ao salvar presenca na API:', err));
  };

  // Salva a assinatura digital feita no canvas
  const handleSaveSignature = async (signatureDataUrl) => {
    if (!currentRecordId || !selectedPatient) return;
    const nowIso = new Date().toISOString();

    const updated = {
      id: currentRecordId,
      data: dateKey,
      cd_paciente: selectedPatient.cd_paciente,
      nome_paciente: selectedPatient.nome_paciente,
      horario_id: selectedShiftId,
      horario_label: SHIFTS.find(s => s.id === selectedShiftId)?.label || '',
      comparecimento: true, // Ao assinar, comparecimento e garantido como verdadeiro
      assinatura: signatureDataUrl,
      data_assinatura: nowIso,
    };

    // Atualiza estados locais imediatamente
    const nextSignatures = { ...signaturesMap, [currentRecordId]: updated };
    const nextAttendance = { ...attendanceMap, [currentRecordId]: true };
    setSignaturesMap(nextSignatures);
    setAttendanceMap(nextAttendance);
    localStorage.setItem('nefrosmart_assinaturas', JSON.stringify(nextSignatures));
    setIsSigning(false);

    // Salva na API do backend
    try {
      await fetch('/api/assinaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('Erro ao salvar assinatura na API:', e);
    }
  };

  return (
    <div className="bg-white w-full rounded-2xl shadow-xl border border-[#d5e7e4] overflow-hidden mb-8 transition-all">
      
      {/* CABEÇALHO DA TELA DE ASSINATURA */}
      <div className="bg-gradient-to-r from-[#087b70] to-[#203a60] text-white p-4 sm:p-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white bg-opacity-15 flex items-center justify-center text-xl shadow-inner">
            ✍️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Assinatura dos Pacientes
            </h2>
            <p className="text-xs sm:text-sm text-teal-100 opacity-90">
              Calendário de sessões, comparecimento e assinatura digital touch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoadingSignatures && (
            <span className="text-xs text-teal-100 opacity-75">Sincronizando...</span>
          )}
          <Button
            type="button"
            onClick={onBack}
            className="!bg-white !bg-opacity-20 hover:!bg-opacity-30 !text-white !border-white !border-opacity-30 !rounded-lg flex items-center gap-2"
          >
            ← Voltar aos Pacientes
          </Button>
        </div>
      </div>

      {/* CORPO PRINCIPAL COM DUAS COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 bg-[#f7faf9]">
        
        {/* COLUNA ESQUERDA: CALENDÁRIO MENSAL */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#d5e7e4] shadow-sm">
            
            {/* Barra de Navegação do Mês */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <Button
                type="button"
                onClick={() => changeMonth(-1)}
                className="!px-3 !py-1 text-xs"
                aria-label="Mês anterior"
              >
                ◀
              </Button>

              <div className="text-center">
                <h3 className="text-base font-bold text-[#203a60]">
                  {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                </h3>
                <button
                  type="button"
                  onClick={goToToday}
                  className="text-[11px] text-[#087b70] hover:underline font-semibold"
                >
                  Ir para Hoje
                </button>
              </div>

              <Button
                type="button"
                onClick={() => changeMonth(1)}
                className="!px-3 !py-1 text-xs"
                aria-label="Próximo mês"
              >
                ▶
              </Button>
            </div>

            {/* Grade do Calendário */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {WEEKDAY_NAMES.map((w, idx) => (
                <span
                  key={w}
                  className={`text-[11px] font-bold py-1 ${idx === 0 ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-16 rounded-lg bg-gray-50 opacity-40" />;
                }

                const { day, isToday, isSelected, isSunday, total, signed, missing } = item;

                return (
                  <button
                    key={item.dateKey}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.date);
                      setSelectedPatient(null);
                      setIsSigning(false);
                    }}
                    className={`h-16 rounded-xl p-1 flex flex-col justify-between items-center text-xs transition-all relative border
                      ${isSelected
                        ? 'border-[#087b70] bg-[#e1f4ef] text-[#087b70] ring-2 ring-[#087b70] font-bold shadow-sm'
                        : isToday
                        ? 'border-[#40baab] bg-white text-[#087b70] font-semibold hover:bg-gray-50'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }
                      ${isSunday ? 'opacity-60 bg-gray-50' : ''}
                    `}
                  >
                    <div className="w-full flex justify-between items-center px-1">
                      <span className={`text-xs ${isToday ? 'font-bold underline' : ''}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#087b70]" title="Hoje" />
                      )}
                    </div>

                    {!isSunday && total > 0 ? (
                      <div className="w-full flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${
                          missing === 0
                            ? 'bg-green-100 text-green-800'
                            : signed > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {signed}/{total}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda do Calendário */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />
                <span>Todos Assinados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
                <span>Pendentes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#e1f4ef] border border-[#087b70] inline-block" />
                <span>Selecionado</span>
              </div>
            </div>

          </div>

          {/* CARD DE RESUMO DO DIA SELECIONADO */}
          <div className="bg-white rounded-xl p-4 border border-[#d5e7e4] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold block">
                  Resumo da Data
                </span>
                <h4 className="text-sm font-bold text-[#203a60]">
                  {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h4>
              </div>
              <span className="text-xl">📅</span>
            </div>

            {/* Barra de Progresso */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600">Progresso de Assinaturas</span>
                <span className="font-bold text-[#087b70]">
                  {dayStats.total > 0 ? Math.round((dayStats.assinados / dayStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#087b70] h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${dayStats.total > 0 ? (dayStats.assinados / dayStats.total) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <span className="block text-[11px] text-gray-500">Total Agendados</span>
                <span className="text-xl font-bold text-[#203a60]">{dayStats.total}</span>
              </div>
              <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                <span className="block text-[11px] text-green-700 font-medium">Já Assinaram</span>
                <span className="text-xl font-bold text-green-700">✓ {dayStats.assinados}</span>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                <span className="block text-[11px] text-amber-700 font-medium">Faltam Assinar</span>
                <span className="text-xl font-bold text-amber-700">⏳ {dayStats.faltam}</span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: 3 HORÁRIOS, LISTA DE PACIENTES E ÁREA DE ASSINATURA */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* SELEÇÃO DOS 3 HORÁRIOS DE HEMODIÁLISE */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#d5e7e4] shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#38776d] mb-3">
              1. Escolha o Horário de Hemodiálise
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SHIFTS.map((shift) => {
                const isSelected = selectedShiftId === shift.id;
                const stats = shiftStats[shift.id] || { total: 0, assinados: 0, faltam: 0 };
                
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => {
                      setSelectedShiftId(shift.id);
                      setSelectedPatient(null);
                      setIsSigning(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between
                      ${isSelected
                        ? 'border-[#087b70] bg-[#f0faf8] ring-2 ring-[#087b70] shadow-sm'
                        : 'border-gray-200 bg-white hover:border-[#40baab] hover:bg-[#fafdfc]'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{shift.icon}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        stats.faltam === 0 && stats.total > 0
                          ? 'bg-green-100 text-green-800'
                          : stats.assinados > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stats.assinados}/{stats.total} assinados
                      </span>
                    </div>
                    <span className="font-bold text-sm text-[#203a60]">{shift.label}</span>
                    <span className="text-xs text-gray-500">{shift.horario}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTA DE PACIENTES DO HORÁRIO (ORDEM ALFABÉTICA) */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#d5e7e4] shadow-sm">
            <div className="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-gray-100 gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#38776d]">
                  2. Pacientes do Horário (Ordem Alfabética)
                </h3>
                <p className="text-xs text-gray-500">
                  Clique no nome do paciente para confirmar comparecimento e assinar
                </p>
              </div>
              <span className="text-xs bg-teal-50 text-[#087b70] px-2.5 py-1 rounded-full font-semibold border border-teal-100">
                {shiftPatients.length} paciente(s)
              </span>
            </div>

            {shiftPatients.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm font-semibold text-gray-600">Nenhum paciente agendado</p>
                <p className="text-xs text-gray-400 mt-1">
                  Não há pacientes programados para este dia e horário.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 pr-1">
                {shiftPatients.map((paciente) => {
                  const recId = `${dateKey}_${selectedShiftId}_${paciente.cd_paciente}`;
                  const rec = signaturesMap[recId];
                  const isSigned = Boolean(rec?.assinatura);
                  const isAttended = Boolean(attendanceMap[recId]);
                  const isPatientSelected = selectedPatient?.cd_paciente === paciente.cd_paciente;

                  return (
                    <div
                      key={paciente.cd_paciente}
                      onClick={() => {
                        setSelectedPatient(paciente);
                        setIsSigning(false);
                      }}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isPatientSelected
                          ? 'bg-[#e1f4ef] border border-[#40baab]'
                          : 'hover:bg-[#f7faf9]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSigned
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-teal-50 text-[#087b70] border border-teal-200'
                        }`}>
                          {isSigned ? '✓' : paciente.nome_paciente ? paciente.nome_paciente.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-[#203a60] block">
                            {paciente.nome_paciente}
                          </span>
                          <span className="text-xs text-gray-500">
                            Cód: {paciente.cd_paciente} • {paciente.nome_turma || 'Hemodiálise Regular'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSigned ? (
                          <span className="text-xs px-2.5 py-1 bg-green-100 text-green-800 font-semibold rounded-full border border-green-200 flex items-center gap-1">
                            <span>✓</span> Assinado
                          </span>
                        ) : isAttended ? (
                          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-full border border-blue-200">
                            Presente (Pendente Assinatura)
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-medium rounded-full border border-amber-200">
                            Pendente
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ÁREA DE COMPARECIMENTO E ASSINATURA DO PACIENTE SELECIONADO */}
          {selectedPatient && (
            <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-[#40baab] shadow-md transition-all">
              
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#38776d] block mb-1">
                    3. Registro de Presença do Paciente
                  </span>
                  <h4 className="text-lg font-bold text-[#203a60]">
                    {selectedPatient.nome_paciente}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Código: {selectedPatient.cd_paciente} • Sessão de {selectedDate.toLocaleDateString('pt-BR')} ({SHIFTS.find(s => s.id === selectedShiftId)?.label})
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="!px-2 !py-1 text-xs"
                >
                  Fechar
                </Button>
              </div>

              {/* QUADRADO DE COMPARECIMENTO */}
              <div
                onClick={handleToggleComparecimento}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 mb-5 ${
                  isComparecimentoChecked
                    ? 'bg-[#f0faf8] border-[#087b70] shadow-xs'
                    : 'bg-gray-50 border-gray-300 hover:border-[#40baab]'
                }`}
                role="checkbox"
                aria-checked={isComparecimentoChecked}
                tabIndex={0}
              >
                <div
                  className={`w-7 h-7 rounded-md border-2 flex items-center justify-center font-bold text-base transition-colors ${
                    isComparecimentoChecked
                      ? 'bg-[#087b70] border-[#087b70] text-white'
                      : 'bg-white border-gray-400 text-transparent'
                  }`}
                >
                  ✓
                </div>
                <div className="flex-1">
                  <span className="font-bold text-base text-[#203a60] block">
                    Comparecimento
                  </span>
                  <span className="text-xs text-gray-600">
                    {isComparecimentoChecked
                      ? 'Comparecimento confirmado para a sessão de hoje.'
                      : 'Clique no quadrado acima para marcar a presença do paciente.'}
                  </span>
                </div>
              </div>

              {/* SEÇÃO DA ASSINATURA */}
              {isSigning ? (
                <SignaturePad
                  onSave={handleSaveSignature}
                  onCancel={() => setIsSigning(false)}
                  initialSignature={currentRecord?.assinatura}
                />
              ) : currentRecord?.assinatura ? (
                <div className="bg-[#fbfdfd] p-4 rounded-xl border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                      <span>✓</span> Assinatura registrada com sucesso
                    </span>
                    {currentRecord.data_assinatura && (
                      <span className="text-[11px] text-gray-500">
                        Horário: {new Date(currentRecord.data_assinatura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-white p-2 rounded-lg border border-gray-200 flex justify-center items-center h-36 overflow-hidden">
                    <img
                      src={currentRecord.assinatura}
                      alt="Assinatura do Paciente"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      type="button"
                      onClick={() => setIsSigning(true)}
                      className="!bg-gray-100 !text-gray-700 !border-gray-300 text-xs"
                    >
                      Refazer Assinatura
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    onClick={() => setIsSigning(true)}
                    className="w-full !py-3.5 !bg-[#087b70] !text-white !border-[#087b70] hover:!bg-[#066158] font-bold text-sm shadow-md !rounded-xl flex justify-center items-center gap-2"
                  >
                    ✍️ Assinar Presença do Dia
                  </Button>
                  <p className="text-center text-[11px] text-gray-400 mt-2">
                    Abre a tela de assinatura para uso com caneta no monitor touch ou mouse
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}