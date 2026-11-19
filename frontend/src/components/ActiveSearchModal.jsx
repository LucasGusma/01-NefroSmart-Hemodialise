import Button from './Button';
import React from 'react';
import { apiFetch as fetch } from '../services/api';

const ActiveSearchModal = ({ title, onSelect, onClose, searchEndpoint, codeField, nameField, searchPlaceholder }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef(null);
  const API_BASE_URL = '/api';

  const handleSearch = React.useCallback(async () => {
    if (searchTerm.length < 3) {
      setError("Por favor, digite pelo menos 3 caracteres para buscar.");
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/lookup/${searchEndpoint}?q=${searchTerm}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) throw new Error(`Falha na busca de ${title}.`);
      const data = await response.json();
      setResults(data);
      if (data.length === 0) {
        setError(`Nenhum resultado encontrado para "${searchTerm}".`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, searchEndpoint, title]);

  React.useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (results.length || 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (document.activeElement === inputRef.current) {
          handleSearch();
        } else if (results[selectedIndex]) {
          onSelect(results[selectedIndex]);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onSelect, onClose, handleSearch]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fp-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="fp-panel-bg rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <header className="p-4 border-b">
          <h3 className="text-xl font-semibold fp-text">{title}</h3>
        </header>
        <div className="p-4 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border fp-border rounded-md"
          />
          <Button onClick={handleSearch} className="px-4 py-2 fp-selected-bg fp-text font-semibold rounded-lg hover:bg-opacity-90">
            Buscar
          </Button>
        </div>
        <main className="p-4 overflow-y-auto">
          {isLoading && <p>A buscar...</p>}
          {error && <p className="fp-error-text">{error}</p>}
          {!isLoading && results.length > 0 && (
            <table className="w-full text-sm text-left">
              <thead className="fp-field-bg">
                <tr>
                  <th className="p-2">Código</th>
                  <th className="p-2">Nome</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
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

export default ActiveSearchModal;
