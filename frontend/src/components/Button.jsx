import React from 'react';

const paths = {
  add: 'M12 5v14M5 12h14',
  edit: 'm4 16 12-12 4 4L8 20H4v-4Z',
  delete: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7',
  close: 'm6 6 12 12M6 18 18 6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  login: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3',
  save: 'M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  next: 'm9 5 7 7-7 7',
  previous: 'm15 5-7 7 7 7',
  signature: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125',
};

export default function Button({ children, icon, className = '', ...props }) {
  const label = typeof children === 'string' ? children.toLowerCase() : '';
  const kind = icon || (
    label.includes('sair') ? 'logout' :
    label.includes('exclu') ? 'delete' :
    label.includes('editar') ? 'edit' :
    label.includes('adicionar') ? 'add' :
    label.includes('assinat') ? 'signature' :
    /cancelar|fechar|voltar/.test(label) ? 'close' :
    /entrar|autentic/.test(label) ? 'login' :
    /buscar|pesquisar/.test(label) ? 'search' : 'save'
  );
  const iconOnly = !label && typeof children !== 'string' && React.isValidElement(children);
  return (
    <button
      {...props}
      data-icon-kind={kind}
      className={`system-button fp-btn-kind-${kind} ${iconOnly ? 'icon-only' : ''} ${className}`}
    >
      {!iconOnly && (
        <span className="button-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={paths[kind] || paths.save} />
          </svg>
        </span>
      )}
      <span className="button-label">{children}</span>
    </button>
  );
}
