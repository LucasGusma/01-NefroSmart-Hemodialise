import Button from './Button';
import React from 'react';

const SearchModal = ({ title, data, onSelect, onClose, codeField, nameField, isLoading, error }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef(null);

  const filteredData = data.filter(item =>
    (item[nameField] && item[nameField].toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item[codeField] && String(item[codeField]).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  React.useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredData.length || 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filteredData.length || 1)) % (filteredData.length || 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredData[selectedIndex]) {
          onSelect(filteredData[selectedIndex]);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData, selectedIndex, onSelect, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fp-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="fp-panel-bg rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <header className="p-4 border-b">
          <h3 className="text-xl font-semibold fp-text">{title}</h3>
        </header>
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filtrar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border fp-border rounded-md"
          />
        </div>
        <main className="p-4 overflow-y-auto">
          {isLoading && <p>A carregar...</p>}
          {error && <p className="fp-error-text">{error}</p>}
          {!isLoading && !error && (
            <table className="w-full text-sm text-left">
              <thead className="fp-field-bg">
                <tr>
                  <th className="p-2">Código</th>
                  <th className="p-2">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr
                    key={item[codeField]}
                    className={`cursor-pointer border-b ${selectedIndex === index ? 'fp-selected-bg fp-text' : 'hover:bg-azul-claro'}`}
                    onClick={() => onSelect(item)}
                  >
                    <td className="p-2">{item[codeField]}</td>
                    <td className="p-2">{item[nameField]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
        <footer className="p-4 border-t flex justify-end">
          <Button onClick={onClose} className="px-4 py-2 bg-gray-300 fp-text font-semibold rounded-lg hover:bg-gray-400">
            Fechar
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default SearchModal;
