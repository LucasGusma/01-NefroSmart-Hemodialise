import Button from './Button';
import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fp-modal-overlay fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="fp-panel-bg rounded-lg shadow-xl w-full max-w-md m-4">
        <header className="p-4 border-b">
          <h3 className="text-xl font-semibold fp-text">{title}</h3>
        </header>
        <main className="p-6">
          {children}
        </main>
        <footer className="p-4 fp-field-bg rounded-b-lg flex justify-end gap-4">
          <Button onClick={onClose} className="px-4 py-2 bg-gray-300 fp-text font-semibold rounded-lg hover:bg-gray-400">
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="px-4 py-2 fp-error-bg fp-text font-semibold rounded-lg hover:bg-red-700">
            Confirmar Exclusão
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmationModal;
