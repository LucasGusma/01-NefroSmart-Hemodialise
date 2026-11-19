import React, { useState, useRef, useEffect } from 'react';
import MonochromeIcon from './MonochromeIcon';
import { SIDEBAR_MODE_OPTIONS } from '../services/themePreferences';

export default function FastPassSidebar({
  sidebarMode = 'preview',
  onChangeSidebarMode,
  activeSection = 'patients',
  onSelectSection,
  isAdmin = false,
  onRefresh,
  onLogout,
  stats = {
    loading: true,
    todayCount: null,
    totalHistorical: null,
    monthCount: null,
    currentMonthLabel: '',
    lastSignatureTime: '--:--',
    lastSignatureFull: 'Sem registro hoje',
    envLabel: 'PRD',
  },
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const isExpandedVisual = sidebarMode === 'expanded' || isPreviewOpen || isMobileOpen;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsModeMenuOpen(false);
      }
    };
    const escape = e => { if (e.key === 'Escape') { setIsModeMenuOpen(false); setIsPreviewOpen(false); setIsMobileOpen(false); } };
    document.addEventListener('keydown', escape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', escape); };
  }, []);

  const handleNavEnter = () => {
    if (sidebarMode === 'preview') {
      setIsPreviewOpen(true);
    }
  };

  const handleSidebarLeave = () => {
    if (sidebarMode !== 'expanded' && !isModeMenuOpen) {
      setIsPreviewOpen(false);
    }
  };

  const assistencialItems = [
    {
      id: 'patients',
      label: 'Pacientes & Escala (TRS)',
      icon: 'patients',
      onClick: () => {
        onSelectSection('patients');
        setIsMobileOpen(false);
      },
    },
    {
      id: 'signatures',
      label: 'Assinatura dos Pacientes (CFID)',
      icon: 'signature',
      onClick: () => {
        onSelectSection('signatures');
        setIsMobileOpen(false);
      },
    },
  ];

  const gestaoItems = [
    ...(isAdmin
      ? [
          {
            id: 'form',
            label: 'Adicionar Novo Paciente',
            icon: 'add',
            onClick: () => {
              onSelectSection('form');
              setIsMobileOpen(false);
            },
          },
        ]
      : []),
    {
      id: 'refresh',
      label: 'Sincronizar Escala MV',
      icon: 'refresh',
      onClick: () => {
        if (onRefresh) onRefresh();
        setIsMobileOpen(false);
      },
    },
  ];

  const todayDisplay = stats.loading ? '—' : String(stats.todayCount ?? 0);
  const monthTotal = stats.monthCount ?? stats.totalHistorical ?? 0;
  const totalDisplay = stats.loading ? '—' : String(monthTotal);

  return (
    <>
      {/* Gatilho Mobile sem depender de hover (Cap. 07, 15, 47) */}
      <button
        type="button"
        className="fp-mobile-nav-trigger"
        onClick={() => setIsMobileOpen((prev) => !prev)}
        aria-expanded={isMobileOpen}
        aria-controls="fp-navigation"
        aria-label={isMobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
      >
        <MonochromeIcon name="sidebarMode" size={18} />
        <span>Menu</span>
      </button>

      {isMobileOpen && (
        <div
          className="fp-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="fp-navigation"
        className={`fp-sidebar-shell mode-${sidebarMode} ${isExpandedVisual ? 'is-open' : 'is-rail'} ${
          isMobileOpen ? 'is-mobile-open' : ''
        }`}
        aria-label="Navegação principal NefroSmart"
        onMouseLeave={handleSidebarLeave}
      >
        <div className="fp-sidebar-panel">
          {/* Topo: Identidade Oficial do Produto + Pontinho Discreto na Borda Externa (Cap. 22, 43, 47) */}
          <div className="fp-sidebar-brand-bar" onMouseEnter={handleNavEnter}>
            <div className="fp-sidebar-brand">
              <img
                src="/assets/nefro-shield.png"
                alt="NefroSmart"
                className="fp-sidebar-brand-symbol"
              />
              {isExpandedVisual && (
                <div className="fp-sidebar-brand-full">
                  <strong className="fp-sidebar-brand-title">
                    Nefro<span>Smart</span>
                  </strong>
                  <span className="fp-sidebar-brand-sub">Gestão de Hemodiálise • TRS</span>
                </div>
              )}
            </div>

            {/* Pontinho discreto (44x44px) com menu dos 3 modos persistentes */}
            <div className="fp-sidebar-pin-wrapper" ref={menuRef}>
              <button
                type="button"
                className="fp-sidebar-pin-btn"
                onClick={() => setIsModeMenuOpen((v) => !v)}
                aria-label={
                  sidebarMode === 'expanded'
                    ? 'Desafixar barra lateral (Modo da barra lateral)'
                    : 'Fixar barra lateral (Modo da barra lateral)'
                }
                aria-expanded={isModeMenuOpen}
                title="Modo da barra lateral"
              >
                <span className="fp-pin-dot" aria-hidden="true" />
                <span className="fp-pin-icon" aria-hidden="true">
                  <MonochromeIcon name="sidebarMode" size={16} />
                </span>
              </button>

              {isModeMenuOpen && (
                <div className="fp-sidebar-mode-menu" role="menu" aria-label="Modo da barra lateral">
                  <div className="fp-mode-menu-header">Modo da barra lateral</div>
                  {SIDEBAR_MODE_OPTIONS.map((opt) => {
                    const selected = sidebarMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        className={`fp-mode-menu-item ${selected ? 'is-selected' : ''}`}
                        onClick={() => {
                          onChangeSidebarMode(opt.id);
                          setIsModeMenuOpen(false);
                          if (opt.id === 'collapsed') setIsPreviewOpen(false);
                        }}
                      >
                        <div>
                          <div className="fp-mode-item-title">{opt.label}</div>
                          <div className="fp-mode-item-desc">{opt.description}</div>
                        </div>
                        {selected && (
                          <span className="fp-mode-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Navegação Principal Agrupada por Domínio (Cap. 07, 08, 22) */}
          <nav className="fp-sidebar-nav" onMouseEnter={handleNavEnter} onFocus={handleNavEnter} aria-label="Módulos do sistema">
            <div className="fp-sidebar-group-title">Áreas Assistenciais</div>
            <ul className="fp-sidebar-list">
              {assistencialItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={`fp-sidebar-item ${isActive ? 'is-active' : ''}`}
                      aria-label={item.label}
                      title={!isExpandedVisual ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <MonochromeIcon name={item.icon} size={20} className="fp-sidebar-icon" />
                      <span className="fp-sidebar-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Divisor discreto antes do segundo grupo (Cap. 07 e 08) */}
            <div className="fp-sidebar-divider" role="presentation" aria-hidden="true" />

            <div className="fp-sidebar-group-title">Gestão e Administração</div>
            <ul className="fp-sidebar-list">
              {gestaoItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={`fp-sidebar-item ${isActive ? 'is-active' : ''}`}
                      aria-label={item.label}
                      title={!isExpandedVisual ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <MonochromeIcon name={item.icon} size={20} className="fp-sidebar-icon" />
                      <span className="fp-sidebar-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Rodapé da Lateral: Indicadores Reais (HOJE, TOTAL HISTÓRICO, ÚLT.) + Saída Independente (Cap. 26, 49, 56) */}
          <div className="fp-sidebar-footer">
            <div
              className="fp-sidebar-stats-area"
              role="button"
              tabIndex={0}
              aria-label="Abrir resumo de assinaturas"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsPreviewOpen(v => !v); } }}
              onClick={() => {
                if (sidebarMode !== 'expanded') setIsPreviewOpen((v) => !v);
              }}
            >
              {(sidebarMode !== 'expanded' && !isMobileOpen) && (
                /* Indicadores compactos na faixa recolhida (Cap. 44, 49, 56) */
                <div className="fp-compact-indicators">
                  <div className="fp-env-pill" title="Ambiente de acesso">
                    
                    <span>{stats.envLabel || 'PRD'}</span>
                  </div>
                  <div className="fp-mini-stat" title="Assinaturas de presença confirmadas hoje">
                    <span className="fp-mini-label">HOJE</span>
                    <strong className="fp-mini-value">{todayDisplay}</strong>
                  </div>
                  <div className="fp-mini-stat" title={`Assinaturas no mês (${stats.currentMonthLabel || 'mês atual'}): ${totalDisplay}`}>
                    <span className="fp-mini-label">MÊS</span>
                    <strong className="fp-mini-value">{totalDisplay}</strong>
                  </div>
                </div>
              )}
              {isExpandedVisual && (
                /* 3 Cartões Completos na Lateral Expandida / Prévia (Cap. 49 e Cap. 56) */
                <div className="fp-expanded-indicators">
                  <div className="fp-env-pill">{stats.envLabel || "PRD"}</div>
                  <div className="fp-summary-grid">
                    <div className="fp-summary-card fp-card-hoje">
                      <span className="fp-summary-label">HOJE</span>
                      <strong className="fp-summary-val">{todayDisplay}</strong>
                    </div>
                    <div className="fp-summary-card fp-card-total" title={`Total de assinaturas registradas no mês (${stats.currentMonthLabel || 'mês atual'})`}>
                      <span className="fp-summary-label">TOTAL DO MÊS</span>
                      <span className="fp-summary-sublabel">{stats.currentMonthLabel ? stats.currentMonthLabel.toUpperCase() : 'NO MÊS'}</span>
                      <strong className="fp-summary-val">{totalDisplay}</strong>
                    </div>
                  </div>
                  <div className="fp-summary-card fp-card-ultima">
                    <span className="fp-summary-label">ÚLTIMA ASSINATURA</span>
                    <strong className="fp-summary-val-time">
                      {stats.loading ? 'Carregando...' : (stats.lastSignatureFull || '—')}
                    </strong>
                  </div>
                  <small className="fp-summary-note">
                    {stats.loading
                      ? 'Calculando assinaturas do mês...'
                      : `Total de assinaturas deste mês (${stats.currentMonthLabel || 'mês atual'}): ${totalDisplay}`}
                  </small>
                  <small className="fp-summary-note">Pacientes cadastrados: {stats.patientCount ?? "—"} · Ativos: {stats.activePatients ?? "—"}</small>
                </div>
              )}
            </div>

            {/* Região de Sair: Não provoca expansão ao aproximar o mouse (Cap. 08 e 47) */}
            <div className="fp-sidebar-logout-zone">
              <button
                type="button"
                onClick={onLogout}
                className="fp-sidebar-logout-btn"
                aria-label="Sair"
                title="Sair do sistema"
              >
                <MonochromeIcon name="logout" size={19} className="fp-logout-icon" />
                {isExpandedVisual && <span className="fp-logout-text">Sair</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
