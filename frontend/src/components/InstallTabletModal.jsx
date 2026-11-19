import MonochromeIcon from './MonochromeIcon';
import React, { useState, useEffect } from 'react';
import Button from './Button';

const InstallTabletModal = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="fp-panel-bg rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border fp-border">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-[#087b70] to-[#40baab] p-4 fp-text flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MonochromeIcon name="tablet" className="fp-semantic-icon" />
            <div>
              <h3 className="font-black text-base sm:text-lg">Baixar / Instalar no Tablet</h3>
              <p className="text-xs text-white/85">Atalho direto na tela inicial sem barras de navegação</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl font-bold p-1 rounded-lg"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Se o navegador suporta instalação direta pelo botão */}
          {deferredPrompt && (
            <div className="fp-selected-bg border fp-border p-4 rounded-xl text-center space-y-2">
              <p className="text-xs font-bold fp-selection-text">
                Seu navegador suporta a instalação direta!
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-2.5 px-4 fp-selected-bg hover:bg-[#06675e] fp-text font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>⬇️</span> Instalar NefroSmart na Tela Inicial Agora
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="fp-selected-bg border fp-border p-3 rounded-xl text-xs fp-selection-text font-bold text-center">
              ✓ Aplicativo já instalado com sucesso na tela inicial!
            </div>
          )}

          {/* Endereço de Acesso no Hotspot */}
          <div className="fp-field-bg border fp-border p-3 rounded-xl text-xs">
            <span className="font-bold fp-selection-text block mb-1">
              1. Endereço de Acesso no Tablet (via Wi-Fi Hotspot):
            </span>
            <div className="fp-panel-bg p-2 rounded-lg border fp-border font-mono text-sm fp-text font-bold select-all flex items-center justify-between">
              <span>http://192.168.137.1:3000</span>
              <span className="text-[11px] fp-muted font-sans">Porta 3000</span>
            </div>
          </div>

          {/* Passo a Passo por Sistema Operacional */}
          <div className="space-y-3">
            <span className="font-bold text-xs fp-text uppercase tracking-wider block">
              2. Como Adicionar à Tela Inicial do Tablet:
            </span>

            {/* Android / Chrome */}
            <div className="p-3.5 rounded-xl border fp-border bg-emerald-50/50 space-y-1.5 text-xs">
              <strong className="fp-selection-text font-bold flex items-center gap-1.5 text-sm">
                <span>🤖</span> No Tablet Android (Google Chrome / Samsung)
              </strong>
              <ol className="list-decimal list-inside space-y-1 fp-text">
                <li>No Chrome do tablet, acesse o endereço acima;</li>
                <li>Toque nos <strong>3 pontinhos verticais (⋮)</strong> no canto superior direito;</li>
                <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>;</li>
                <li>Confirme em <strong>"Instalar"</strong>.</li>
              </ol>
            </div>

            {/* Apple iPad / Safari */}
            <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-1.5 text-xs">
              <strong className="text-sky-900 font-bold flex items-center gap-1.5 text-sm">
                <span>🍏</span> No iPad / Apple (Safari)
              </strong>
              <ol className="list-decimal list-inside space-y-1 fp-text">
                <li>No Safari do iPad, acesse o endereço acima;</li>
                <li>Toque no botão de <strong>Compartilhar (quadrado com seta para cima ⎋)</strong>;</li>
                <li>Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>;</li>
                <li>Toque em <strong>"Adicionar"</strong> no topo direito.</li>
              </ol>
            </div>
          </div>

          {/* Benefício da Instalação */}
          <div className="fp-field-bg border fp-border p-3 rounded-xl text-xs fp-muted flex items-start gap-2">
            <span className="text-base fp-selection-text">✨</span>
            <div>
              <strong>Vantagem de Instalar:</strong> O aplicativo abrirá em <strong>tela cheia</strong>, sem a barra de endereços do navegador e sem abas, oferecendo a experiência ideal para o paciente assinar com a caneta sem risco de fechar a página.
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-3 fp-field-bg border-t fp-border flex justify-end">
          <Button onClick={onClose}>Entendi</Button>
        </div>

      </div>
    </div>
  );
};

export default InstallTabletModal;
