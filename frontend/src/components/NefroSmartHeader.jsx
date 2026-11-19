import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';
import MonochromeIcon from './MonochromeIcon';
import { THEME_OPTIONS, SIDEBAR_MODE_OPTIONS } from '../services/themePreferences';

const NefroSmartHeader = ({
  user,
  onLogout,
  themeChoice = 'system',
  onChangeTheme,
  sidebarMode = 'preview',
  onChangeSidebarMode,
  subtitle = 'Unidade de Terapia Renal Substitutiva (TRS) • CNES 2151609 • Belo Horizonte / MG',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isMaster = Boolean(
    user &&
      (String(user.login || user.usuario || user.sub || '').toUpperCase() === 'ADMIN' ||
        String(user.login || '').toLowerCase() === 'master' ||
        user?.perfis?.includes('MASTER'))
  );

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const escape = e => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', escape);
    document.addEventListener('mousedown', handleOutside);
    return () => { document.removeEventListener('mousedown', handleOutside); document.removeEventListener('keydown', escape); };
  }, []);

  return (
    <header className="site-header fp-workspace-header">
      <div className="fp-header-left">
        <div className="site-brand">
          <img className="nefro-shield" src="/assets/nefro-shield.png" alt="Logo NefroSmart" />
          <div className="fp-brand-titles">
            <h1>
              Nefro<span>Smart</span>
            </h1>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="header-account fp-header-right">
        <div className="fp-user-meta">
          <span className="fp-user-greeting">
            Bem-vindo, <strong>{user?.login}</strong>
            {isMaster && (
              <span className="fp-master-badge" title="Perfil Master com acesso irrestrito">
                MASTER
              </span>
            )}
          </span>
          <small className="fp-user-role">
            {isMaster
              ? 'Acesso Total Master (Edição e visualização irrestrita)'
              : user?.demo
                ? 'Modo demonstração • dados fictícios'
                : user?.perfis?.join(', ')}
          </small>
        </div>

        <div className="fp-header-actions">
          <Button onClick={onLogout} className="fp-btn-logout">
            Sair do sistema
          </Button>

          {/* Menu de 3 pontos (⋮) para seleção de Aparência/Tema (Capítulos 04 e 45) */}
          <div className="fp-theme-menu-container" ref={menuRef}>
            <button
              type="button"
              className="fp-three-dots-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Opções de aparência e tema"
              aria-expanded={menuOpen}
              title="Aparência e configurações visuais (Seguir o sistema, Claro, Escuro, Baleia)"
            >
              <MonochromeIcon name="dots" size={18} />
            </button>

            {menuOpen && (
              <div className="fp-theme-dropdown" role="menu" aria-label="Aparência do sistema">
                <div className="fp-dropdown-section-title">Aparência (Tema do Painel)</div>
                {THEME_OPTIONS.map((opt) => {
                  const active = themeChoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`fp-dropdown-item ${active ? 'is-selected' : ''}`}
                      onClick={() => {
                        if (onChangeTheme) onChangeTheme(opt.id);
                        setMenuOpen(false);
                      }}
                    >
                      <div>
                        <div className="fp-dropdown-item-label">{opt.label}</div>
                        <div className="fp-dropdown-item-desc">{opt.description}</div>
                      </div>
                      {active && (
                        <span className="fp-dropdown-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}

                {onChangeSidebarMode && (
                  <>
                    <div className="fp-dropdown-divider" role="separator" />
                    <div className="fp-dropdown-section-title">Modo da Barra Lateral</div>
                    {SIDEBAR_MODE_OPTIONS.map((opt) => {
                      const active = sidebarMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          className={`fp-dropdown-item ${active ? 'is-selected' : ''}`}
                          onClick={() => {
                            onChangeSidebarMode(opt.id);
                            setMenuOpen(false);
                          }}
                        >
                          <div>
                            <div className="fp-dropdown-item-label">{opt.label}</div>
                            <div className="fp-dropdown-item-desc">{opt.description}</div>
                          </div>
                          {active && (
                            <span className="fp-dropdown-check" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NefroSmartHeader;
