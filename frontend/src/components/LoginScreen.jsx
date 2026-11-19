import Button from './Button';
import React from 'react';
import { apiFetch as fetch } from '../services/api';

const LoginScreen = ({ onLoginSuccess }) => {
    const [usuario, setUsuario] = React.useState('');
    const [senha, setSenha] = React.useState('');
    const [ambiente, setAmbiente] = React.useState('PRD');
    const [erro, setErro] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro('');
        setLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha })
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Não foi possível conectar à API. Abra o site pelo arquivo ABRIR-SITE.cmd.');
            }
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro na autenticação');
            }

            localStorage.setItem('authToken', data.token);
            if (data.user.demo) localStorage.setItem('demoMode', 'true');
            else localStorage.removeItem('demoMode');
            localStorage.setItem('userData', JSON.stringify(data.user));
            onLoginSuccess(data.user);
            
        } catch (err) {
            setErro(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" data-login-isolated="true">
            <div className="login-bg-video-container" aria-hidden="true">
                <video
                    className="login-bg-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                >
                    <source src="/assets/baleia-fundo-animado.mp4" type="video/mp4" />
                </video>
                <div className="login-bg-overlay" />
            </div>

            <main className="login-wrapper">
                <div className="login-card">
                    <div className="login-header">
                        <div className="logo-container">
                            <img
                                src="/assets/baleia-ia-animated.svg"
                                alt="Logo BaleIA"
                                className="login-card-baleia-logo"
                                onError={(e) => { e.currentTarget.src = '/assets/baleia-ia-badge.png'; }}
                            />
                        </div>
                        <div className="login-eyebrow">MAIS ORGANIZAÇÃO. MAIS TEMPO PARA CUIDAR.</div>
                        <h2>Bem-vindo!</h2>
                        <p>Acesse sua conta para gerenciar os<br /> atendimentos e assinaturas de hemodiálise (CFID / SUS).</p>
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="input-group">
                            <label htmlFor="username">Usuário (MV)</label>
                            <input 
                                type="text" 
                                id="username" 
                                placeholder="Ex: ADMIN" 
                                required 
                                autoComplete="username"
                                value={usuario} 
                                onChange={(e) => setUsuario(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Senha</label>
                            <div className="password-field">
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    id="password" 
                                    placeholder="••••••••" 
                                    required
                                    autoComplete="current-password"
                                    value={senha} 
                                    onChange={(e) => setSenha(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    aria-pressed={showPassword}
                                    onClick={() => setShowPassword(value => !value)}
                                >
                                    {showPassword ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="ambiente-mv">Ambiente de Conexão (Banco MV)</label>
                            <select
                                id="ambiente-mv"
                                value={ambiente}
                                onChange={(e) => setAmbiente(e.target.value)}
                                className="login-env-select"
                            >
                                <option value="PRD">Produção (PRD — MV2000 / Auth Central Service)</option>
                            </select>
                        </div>

                        {erro && (
                            <div className="alert-box show" id="alertBox" role="alert">
                                {erro}
                            </div>
                        )}

                        <Button type="submit" className="btn-primary" id="btnSubmit" disabled={loading}>
                            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
                        </Button>
                    </form>
                    
                    <div className="login-footer">
                        <span aria-hidden="true">●</span> Mais organização. Mais tempo para cuidar.
                    </div>
                </div>
            </main>
            <footer className="login-page-footer">Hospital de Referência Modelo <span>·</span> NefroSmart — Sistema de Gestão de Hemodiálise</footer>
        </div>
    );
};

export default LoginScreen;
