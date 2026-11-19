import React from 'react';

export default function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-logo">
      <img src="/assets/hospital-baleia-padrao.png" alt="Hospital de Referência Modelo" className="logo-light" />
      <img src="/assets/hospital-baleia-dark.png" alt="Hospital de Referência Modelo" className="logo-dark" />
    </div>
    <div><p>Gestão de hemodiálise • Uso interno</p>
      <small>Desenvolvedores: Lucas Gusmão · Kevin Alexandre · Lucas Augusto</small></div>
  </footer>;
}
