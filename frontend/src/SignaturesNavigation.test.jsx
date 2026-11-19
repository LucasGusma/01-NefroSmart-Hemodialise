import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { apiFetch } from './services/api';

jest.mock('./services/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => { localStorage.clear(); jest.clearAllMocks(); });

test('opens signatures as the main screen and returns to the patient list', async () => {
  localStorage.setItem('authToken', 'test-token');
  localStorage.setItem('userData', JSON.stringify({ login: 'Teste', perfis: ['ADMIN'] }));
  apiFetch.mockResolvedValue({ ok: true, json: async () => [] });
  await act(async () => { render(<App />); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Assinatura dos Pacientes' })); });
  const title = await screen.findByRole('heading', { name: /Assinatura dos Pacientes - Hemodiálise/ });
  expect(title).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Pesquisar paciente...')).not.toBeInTheDocument();
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/assinaturas?data=')));
  fireEvent.click(screen.getAllByRole('button', { name: 'Voltar aos pacientes' })[0]);
  expect(screen.getByPlaceholderText('Pesquisar paciente...')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Assinatura dos Pacientes - Hemodiálise/ })).not.toBeInTheDocument();
});
