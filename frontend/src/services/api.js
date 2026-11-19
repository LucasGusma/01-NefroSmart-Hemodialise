import { demoRequest } from './demo';

export function startDemo() {
  const user = { login: 'ADMIN', apelido: 'master', perfis: ['ADMIN', 'MASTER'], demo: true };
  localStorage.setItem('demoMode', 'true');
  localStorage.setItem('authToken', 'local-demo');
  localStorage.setItem('userData', JSON.stringify(user));
  return user;
}

export async function apiFetch(url, options = {}) {
  if (url !== '/api/login' && localStorage.getItem('demoMode') === 'true') {
    return demoRequest(url, options);
  }

  const token = localStorage.getItem('authToken');
  const headers = {
    ...(options.headers || {}),
  };

  // Anexa automaticamente o token JWT nas requisições autenticadas para o backend Flask
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return window.fetch(url, {
    ...options,
    headers,
  });
}
