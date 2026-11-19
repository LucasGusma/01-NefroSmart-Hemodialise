import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

beforeEach(() => localStorage.clear());

test('mostra até 15 pacientes por página e reinicia a página ao pesquisar', async () => {
  localStorage.setItem('demoPatients', JSON.stringify(Array.from({ length: 31 }, (_, i) => ({ cd_paciente: i + 1, nome_paciente: `Paciente ${String(i + 1).padStart(2, '0')}` }))));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /visualizar demonstração/i }));
  await screen.findByText('Paciente 01');
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(16);
  expect(screen.queryByText('Paciente 16')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  expect(screen.getByText('Paciente 16')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  expect(screen.getByText('Paciente 31')).toBeInTheDocument();
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Filtrar por Código ou Nome do Paciente:'), { target: { value: 'Paciente 01' } });
  expect(screen.getByText('Paciente 01')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Páginas de pacientes' })).not.toBeInTheDocument();
});

test('abre demonstração sem autenticação externa e permite sair', async () => {
  const originalFetch = window.fetch;
  const network = jest.fn(() => Promise.reject(new Error('Rede não esperada')));
  window.fetch = network;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /visualizar demonstração/i }));
  expect(await screen.findByText('Ana Exemplo')).toBeInTheDocument();
  expect(network).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /sair do sistema/i }));
  expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
  expect(localStorage.getItem('demoMode')).toBeNull();
  window.fetch = originalFetch;
});
