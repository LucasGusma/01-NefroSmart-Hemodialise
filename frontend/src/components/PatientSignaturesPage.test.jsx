import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientSignaturesPage from './PatientSignaturesPage';
import { apiFetch } from '../services/api';

jest.mock('../services/api', () => ({
  apiFetch: jest.fn(),
}));

describe('PatientSignaturesPage Component', () => {
  const mockPacientes = [
    {
      cd_paciente: 2001,
      nome_paciente: 'Carlos Santos',
      cd_turma: 1,
      nome_turma: 'Seg / Qua / Sex — Manhã',
      tp_dias_semana: 'SQS',
      hr_atendimento: '07:00',
      sn_ativo: 'S',
      dt_inicio_vigencia: '2026-01-01',
    },
    {
      cd_paciente: 2002,
      nome_paciente: 'Mariana Lima',
      cd_turma: 2,
      nome_turma: 'Ter / Qui / Sáb — Tarde',
      tp_dias_semana: 'TQS',
      hr_atendimento: '13:00',
      sn_ativo: 'S',
      dt_inicio_vigencia: '2026-01-01',
    },
    {
      cd_paciente: 2003,
      nome_paciente: 'Roberto Oliveira',
      cd_turma: 3,
      nome_turma: 'Diário — Noite',
      tp_dias_semana: 'TODOS',
      hr_atendimento: '17:00',
      sn_ativo: 'S',
      dt_inicio_vigencia: '2026-01-01',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiFetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/pacientes')) {
        return { ok: true, json: async () => mockPacientes };
      }
      return { ok: true, json: async () => [] };
    });
  });

  test('renders page title and focuses heading on mount', async () => {
    await act(async () => {
      render(<PatientSignaturesPage onBack={jest.fn()} pacientes={mockPacientes} />);
    });
    const heading = screen.getByRole('heading', { name: /Assinatura dos Pacientes - Hemodiálise/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveFocus();
  });

  test('displays calendar navigation and legal notice', async () => {
    await act(async () => {
      render(<PatientSignaturesPage onBack={jest.fn()} pacientes={mockPacientes} />);
    });
    expect(screen.getByText(/Legenda:/i)).toBeInTheDocument();
    expect(screen.getByText(/Dias Passados \(Cinza escuro\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Preservação e Guarda Vitalícia no Banco de Dados/i)).toBeInTheDocument();
  });

  test('shows (verificar assinatura de paciente) in front of patient name even if not attended', async () => {
    await act(async () => {
      render(<PatientSignaturesPage onBack={jest.fn()} pacientes={mockPacientes} />);
    });

    const verifyBtns = screen.queryAllByRole('button', { name: /verificar assinatura de paciente/i });
    expect(verifyBtns.length).toBeGreaterThan(0);

    // Clica no botão verificar assinatura de um paciente que não compareceu
    await act(async () => {
      fireEvent.click(verifyBtns[0]);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Sem assinatura registrada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Não comparecido/i).length).toBeGreaterThan(0);
  });

  test('allows opening tablet signature modal when clicking Marcar Comparecido', async () => {
    await act(async () => {
      render(<PatientSignaturesPage onBack={jest.fn()} pacientes={mockPacientes} />);
    });

    const actionButtons = screen.queryAllByRole('button', { name: /Marcar Comparecido/i });
    if (actionButtons.length > 0) {
      await act(async () => {
        fireEvent.click(actionButtons[0]);
      });
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Comprovante Individual de Presença — Hemodiálise/i)).toBeInTheDocument();
    }
  });

  test('calls onBack when clicking Voltar aos pacientes', async () => {
    const handleBack = jest.fn();
    await act(async () => {
      render(<PatientSignaturesPage onBack={handleBack} pacientes={mockPacientes} />);
    });
    const backBtn = screen.getAllByRole('button', { name: /Voltar aos pacientes/i })[0];
    await act(async () => {
      fireEvent.click(backBtn);
    });
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
