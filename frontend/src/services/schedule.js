/**
 * Utilitários para gestão de escalas, turnos e dias de atendimento de hemodiálise.
 */

export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DIAS_SEMANA_EXTENSO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const MESES_EXTENSO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TURNOS = [
  { id: '1', nome: '1º Turno (Manhã)', horarioPadrao: '06:00', chave: 'manha' },
  { id: '2', nome: '2º Turno (Tarde)', horarioPadrao: '11:30', chave: 'tarde' },
  { id: '3', nome: '3º Turno (Noite)', horarioPadrao: '16:00', chave: 'noite' }
];

/**
 * Converte de forma resiliente qualquer formato de data (ISO, RFC, BR) em Date.
 */
export function parseDateFlexible(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const s = val.trim();
    // Formato YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 12, 0, 0);
    }
    // Formato DD/MM/YYYY
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]), 12, 0, 0);
    }
    // Formato geral (incluindo datas RFC de servidores)
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

/**
 * Identifica o turno de atendimento do paciente baseado no horário (ex: 06:00, 11:30, 16:30)
 * ou na descrição da turma / escala cadastrada.
 */
export function getTurnoPaciente(paciente) {
  if (!paciente) return TURNOS[0];

  const rawTurma = `${paciente.nome_turma || ''} ${paciente.ds_turma || ''} ${paciente.hr_atendimento || ''}`.toUpperCase();
  const nomeLimpo = rawTurma.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Procura primeiro por horário numérico formatado (ex: "06:00", "07:00", "11:30", "16:00", "16:30")
  const horaMatch = rawTurma.match(/(\d{1,2}):(\d{2})/);
  if (horaMatch) {
    const hora = parseInt(horaMatch[1], 10);
    const minuto = parseInt(horaMatch[2], 10);
    const horaDecimal = hora + (minuto / 60);

    // Madrugada / Manhã (antes das 11:00) -> 1º Turno (Manhã)
    if (horaDecimal < 11.0) {
      return { id: '1', nome: '1º Turno (Manhã)', horarioPadrao: horaMatch[0], chave: 'manha' };
    }
    // Almoço / Tarde (11:00 até antes das 15:45) -> 2º Turno (Tarde)
    if (horaDecimal >= 11.0 && horaDecimal < 15.75) {
      return { id: '2', nome: '2º Turno (Tarde)', horarioPadrao: horaMatch[0], chave: 'tarde' };
    }
    // Fim de tarde / Noite (a partir das 15:45) -> 3º Turno (Noite)
    return { id: '3', nome: '3º Turno (Noite)', horarioPadrao: horaMatch[0], chave: 'noite' };
  }

  // 2. Se não houver horário explícito, analisa palavras-chave
  if (nomeLimpo.includes('NOITE') || nomeLimpo.includes('3 TURNO') || nomeLimpo.includes('3º TURNO')) {
    return TURNOS[2];
  }
  if (nomeLimpo.includes('TARDE') || nomeLimpo.includes('2 TURNO') || nomeLimpo.includes('2º TURNO')) {
    return TURNOS[1];
  }
  if (nomeLimpo.includes('MANHA') || nomeLimpo.includes('1 TURNO') || nomeLimpo.includes('1º TURNO')) {
    return TURNOS[0];
  }

  return TURNOS[0];
}

/**
 * Verifica se um paciente tem sessão regular agendada para a data especificada (YYYY-MM-DD).
 */
export function isPacienteAgendadoParaData(paciente, dateStr) {
  if (!paciente) return false;

  // Se o paciente está explicitamente inativo com 'N', desconsidera
  if (paciente.sn_ativo && String(paciente.sn_ativo).toUpperCase() === 'N') {
    return false;
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d, 12, 0, 0);

  // Validação de Vigência (início e fim)
  if (paciente.dt_inicio_vigencia) {
    const inicioDate = parseDateFlexible(paciente.dt_inicio_vigencia);
    if (inicioDate) {
      // Normaliza para meia-noite
      inicioDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(targetDate);
      checkDate.setHours(23, 59, 59, 999);
      if (checkDate < inicioDate) {
        return false;
      }
    }
  }

  if (paciente.dt_fim_vigencia) {
    const fimDate = parseDateFlexible(paciente.dt_fim_vigencia);
    if (fimDate) {
      fimDate.setHours(23, 59, 59, 999);
      const checkDate = new Date(targetDate);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate > fimDate) {
        return false;
      }
    }
  }

  const dayOfWeek = targetDate.getDay(); // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  if (dayOfWeek === 0) return false; // Domingo geralmente não tem sessão regular de hemodiálise crônica

  // Normalização do texto da turma e indicadores de dias
  const tpDias = (paciente.tp_dias_semana || '').toUpperCase().trim();
  const rawTurma = `${paciente.nome_turma || ''} ${paciente.ds_turma || ''}`;
  const nomeTurma = rawTurma.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos (TERÇA -> TERCA, SÁBADO -> SABADO)

  // Verifica se é Segunda / Quarta / Sexta (SQS)
  const isSQS = tpDias === 'SQS' ||
                nomeTurma.includes('SQS') ||
                nomeTurma.includes('SEGUNDA') ||
                nomeTurma.includes('QUARTA') ||
                nomeTurma.includes('SEXTA') ||
                (nomeTurma.includes('SEG') && nomeTurma.includes('QUA')) ||
                (nomeTurma.includes('SEG') && nomeTurma.includes('SEX'));

  // Verifica se é Terça / Quinta / Sábado (TQS)
  const isTQS = tpDias === 'TQS' ||
                nomeTurma.includes('TQS') ||
                nomeTurma.includes('TERCA') ||
                nomeTurma.includes('QUINTA') ||
                nomeTurma.includes('SABADO') ||
                (nomeTurma.includes('TER') && nomeTurma.includes('QUI')) ||
                (nomeTurma.includes('TER') && nomeTurma.includes('SAB'));

  if (isSQS && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5)) {
    return true;
  }

  if (isTQS && (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6)) {
    return true;
  }

  // Fallback caso a turma seja identificada pelo ID numérico
  if (!isSQS && !isTQS && paciente.cd_turma) {
    const num = Number(paciente.cd_turma);
    if (num % 2 === 1 && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5)) return true;
    if (num % 2 === 0 && (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6)) return true;
  }

  return false;
}

/**
 * Formata data YYYY-MM-DD para DD/MM/YYYY.
 */
export function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formata data YYYY-MM-DD para extenso ("Segunda-feira, 26 de Outubro de 2026").
 */
export function formatDateLongBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = DIAS_SEMANA_EXTENSO[dateObj.getDay()];
  const monthName = MESES_EXTENSO[m - 1];
  return `${dayOfWeek}, ${String(d).padStart(2, '0')} de ${monthName} de ${y}`;
}

/**
 * Gera a matriz de dias para exibição no calendário de um mês específico.
 */
export function getCalendarMonthDays(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 a 6

  const days = [];

  // Dias do mês anterior para preencher a primeira semana
  const prevMonthTotalDays = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const prevDate = new Date(year, monthIndex - 1, dayNum);
    const dateStr = prevDate.toISOString().slice(0, 10);
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: true,
    });
  }

  // Dias do mês corrente
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Dias do próximo mês para completar semanas
  const remainingCells = 42 - days.length; // 6 linhas x 7 colunas = 42 células
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, monthIndex + 1, d);
    const dateStr = nextDate.toISOString().slice(0, 10);
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isNextMonth: true,
    });
  }

  return days;
}
