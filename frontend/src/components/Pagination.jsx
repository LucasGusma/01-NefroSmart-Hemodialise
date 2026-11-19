import React from 'react';
import Button from './Button';

export const PAGE_SIZE = 15;

export default function Pagination({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Páginas de pacientes">
    <Button icon="previous" aria-label="Página anterior" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</Button>
    <span aria-live="polite">Página {page} de {pages} · {total} pacientes</span>
    <Button icon="next" aria-label="Próxima página" disabled={page === pages} onClick={() => onChange(page + 1)}>Próxima</Button>
  </nav>;
}
