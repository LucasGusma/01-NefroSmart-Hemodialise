import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FastPassSidebar from './FastPassSidebar';

const props = { onSelectSection: jest.fn(), onChangeSidebarMode: jest.fn(), onLogout: jest.fn() };
test('keeps compact indicators mounted during preview and distinguishes zero from unavailable', () => {
  const { rerender } = render(<FastPassSidebar {...props} stats={{ loading: true }} />);
  const summary = screen.getByRole('button', { name: 'Abrir resumo de assinaturas' });
  expect(within(summary).getByText('HOJE')).toBeInTheDocument();
  expect(within(summary).queryByText('0')).not.toBeInTheDocument();
  fireEvent.mouseEnter(screen.getByRole('navigation', { name: 'Módulos do sistema' }));
  expect(within(summary).getByText('ÚLT.')).toBeInTheDocument();
  expect(within(summary).getByText('TOTAL HISTÓRICO')).toBeInTheDocument();
  rerender(<FastPassSidebar {...props} stats={{ loading: false, todayCount: 0 }} />);
  expect(within(summary).getAllByText('0')).toHaveLength(2);
  rerender(<FastPassSidebar {...props} stats={{ loading: false, error: true }} />);
  expect(within(summary).queryByText('0')).not.toBeInTheDocument();
});
test('collapsed summary opens by keyboard and Escape dismisses it', () => {
  render(<FastPassSidebar {...props} sidebarMode="collapsed" />);
  const summary = screen.getByRole('button', { name: 'Abrir resumo de assinaturas' });
  fireEvent.keyDown(summary, { key: 'Enter' });
  expect(screen.getByText('TOTAL HISTÓRICO')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByText('TOTAL HISTÓRICO')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sair', exact: true }));
  expect(props.onLogout).toHaveBeenCalledTimes(1);
});
