import { sortPatients } from './patients';

test('ordena por nome em português, sem alterar a lista original', () => {
  const patients = ['Zélia', 'bruno', 'Álvaro', 'Ana', null].map((nome_paciente, cd_paciente) => ({ nome_paciente, cd_paciente }));
  expect(sortPatients(patients).map(p => p.nome_paciente)).toEqual(['Álvaro', 'Ana', 'bruno', 'Zélia', null]);
  expect(patients[0].nome_paciente).toBe('Zélia');
});
