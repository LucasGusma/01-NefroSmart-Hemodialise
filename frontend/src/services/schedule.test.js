import {
  isPacienteAgendadoParaData,
  getTurnoPaciente,
  formatDateBR,
  formatDateLongBR,
  getCalendarMonthDays,
} from './schedule';

describe('schedule service', () => {
  const pacienteHospitalReal = {
    cd_paciente: 462812,
    nome_paciente: 'ADALBERTO BATISTA BAIA',
    nome_turma: 'SEGUNDA, QUARTA E SEXTA- 06:00',
    sn_ativo: 'S',
    dt_inicio_vigencia: '2026-01-01',
    dt_fim_vigencia: '',
  };

  const pacienteTQSReal = {
    cd_paciente: 538601,
    nome_paciente: 'ADRIANA DA COSTA CAMPOS',
    nome_turma: 'TERÇA, QUINTA E SÁBADO- 11:30',
    sn_ativo: 'S',
    dt_inicio_vigencia: '2026-01-01',
    dt_fim_vigencia: '',
  };

  const pacienteNoiteReal = {
    cd_paciente: 375038,
    nome_paciente: 'ADRIANA DA ROCHA SILVA',
    nome_turma: 'SEGUNDA, QUARTA E SEXTA- 16:30',
    sn_ativo: 'S',
  };

  test('detects hospital real turma format for SQS on Mon, Wed, Fri', () => {
    // 2026-10-26 é Segunda-feira
    expect(isPacienteAgendadoParaData(pacienteHospitalReal, '2026-10-26')).toBe(true);
    // 2026-10-28 é Quarta-feira
    expect(isPacienteAgendadoParaData(pacienteHospitalReal, '2026-10-28')).toBe(true);
    // 2026-10-30 é Sexta-feira
    expect(isPacienteAgendadoParaData(pacienteHospitalReal, '2026-10-30')).toBe(true);
    // 2026-10-27 é Terça-feira (não deve aparecer)
    expect(isPacienteAgendadoParaData(pacienteHospitalReal, '2026-10-27')).toBe(false);
  });

  test('detects hospital real turma format for TQS on Tue, Thu, Sat', () => {
    // 2026-10-27 é Terça-feira
    expect(isPacienteAgendadoParaData(pacienteTQSReal, '2026-10-27')).toBe(true);
    // 2026-10-29 é Quinta-feira
    expect(isPacienteAgendadoParaData(pacienteTQSReal, '2026-10-29')).toBe(true);
    // 2026-10-31 é Sábado
    expect(isPacienteAgendadoParaData(pacienteTQSReal, '2026-10-31')).toBe(true);
    // 2026-10-30 é Sexta-feira (não deve aparecer)
    expect(isPacienteAgendadoParaData(pacienteTQSReal, '2026-10-30')).toBe(false);
  });

  test('detects correct shifts based on 06:00, 11:30, and 16:30', () => {
    expect(getTurnoPaciente(pacienteHospitalReal).id).toBe('1'); // 06:00 -> Manhã
    expect(getTurnoPaciente(pacienteHospitalReal).nome).toContain('Manhã');

    expect(getTurnoPaciente(pacienteTQSReal).id).toBe('2'); // 11:30 -> Tarde
    expect(getTurnoPaciente(pacienteTQSReal).nome).toContain('Tarde');

    expect(getTurnoPaciente(pacienteNoiteReal).id).toBe('3'); // 16:30 -> Noite
    expect(getTurnoPaciente(pacienteNoiteReal).nome).toContain('Noite');
  });

  test('date formatters work correctly', () => {
    expect(formatDateBR('2026-10-30')).toBe('30/10/2026');
    expect(formatDateLongBR('2026-10-30')).toBe('Sexta-feira, 30 de Outubro de 2026');
  });

  test('getCalendarMonthDays generates 42 days grid with correct month days', () => {
    const days = getCalendarMonthDays(2026, 9); // Outubro 2026
    expect(days).toHaveLength(42);
    const octDays = days.filter(d => d.isCurrentMonth);
    expect(octDays).toHaveLength(31);
  });
});
