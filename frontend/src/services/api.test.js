import { apiFetch, startDemo } from './api';

beforeEach(() => localStorage.clear());

test('demonstração mantém cadastro, edição e exclusão apenas no navegador', async () => {
  startDemo();
  const patient = { cd_paciente: 1004, nome_paciente: 'Pedro Exemplo', cd_turma: 1 };
  expect((await apiFetch('/api/pacientes', { method: 'POST', body: JSON.stringify(patient) })).ok).toBe(true);
  expect((await apiFetch('/api/pacientes', { method: 'POST', body: JSON.stringify(patient) })).status).toBe(409);
  await apiFetch('/api/pacientes/1004', { method: 'PUT', body: JSON.stringify({ ...patient, cd_turma: 2 }) });
  let patients = await (await apiFetch('/api/pacientes')).json();
  expect(patients.find(p => p.cd_paciente === 1004).cd_turma).toBe(2);
  await apiFetch('/api/pacientes/1004', { method: 'DELETE' });
  patients = await (await apiFetch('/api/pacientes')).json();
  expect(patients.some(p => p.cd_paciente === 1004)).toBe(false);
});
