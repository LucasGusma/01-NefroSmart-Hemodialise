/**
 * Gerenciamento de preferência de Tema (Seguir o sistema, Claro, Escuro, Baleia)
 * e Modo da Barra Lateral (Recolhida fixa, Recolhida com prévia, Expandida fixa),
 * com persistência isolada por usuário (Capítulos 04, 25, 43, 45 e 47 do Manual FastPass v3.0).
 */

export const THEME_OPTIONS = [
  { id: 'system', label: 'Seguir o sistema', description: 'Adapta ao Windows / navegador' },
  { id: 'light', label: 'Claro', description: 'Superfícies brancas e cinza suave' },
  { id: 'dark', label: 'Escuro', description: 'Camadas de grafite e texto claro' },
  { id: 'baleia', label: 'Baleia', description: 'Azul institucional em camadas' },
];

export const SIDEBAR_MODE_OPTIONS = [
  { id: 'collapsed', label: 'Recolhida fixa', description: 'Não expande com o mouse' },
  { id: 'preview', label: 'Recolhida com prévia', description: 'Expande ao passar o mouse' },
  { id: 'expanded', label: 'Expandida fixa', description: 'Permanece aberta' },
];

export function normalizeUserKey(user) {
  if (!user) return 'anon';
  const raw = String(user.login || user.usuario || user.sub || 'anon').trim().toUpperCase();
  return raw.replace(/[^A-Z0-9_-]/g, '_') || 'anon';
}

export function getStoredThemeChoice(user) {
  const key = `nefrosmart_theme_${normalizeUserKey(user)}`;
  try {
    const val = localStorage.getItem(key);
    if (val && ['system', 'light', 'dark', 'baleia'].includes(val)) {
      return val;
    }
  } catch (e) {}
  return 'system';
}

export function setStoredThemeChoice(user, choice) {
  const valid = ['system', 'light', 'dark', 'baleia'].includes(choice) ? choice : 'system';
  const key = `nefrosmart_theme_${normalizeUserKey(user)}`;
  try {
    localStorage.setItem(key, valid);
  } catch (e) {}
  return valid;
}

export function resolveEffectiveTheme(choice) {
  if (choice === 'light' || choice === 'dark' || choice === 'baleia') {
    return choice;
  }
  try {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {}
  return 'light';
}

export function getStoredSidebarMode(user) {
  const key = `nefrosmart_sidebar_mode_${normalizeUserKey(user)}`;
  try {
    const val = localStorage.getItem(key);
    if (val && ['collapsed', 'preview', 'expanded'].includes(val)) {
      return val;
    }
  } catch (e) {}
  return 'preview';
}

export function setStoredSidebarMode(user, mode) {
  const valid = ['collapsed', 'preview', 'expanded'].includes(mode) ? mode : 'preview';
  const key = `nefrosmart_sidebar_mode_${normalizeUserKey(user)}`;
  try {
    localStorage.setItem(key, valid);
  } catch (e) {}
  return valid;
}
