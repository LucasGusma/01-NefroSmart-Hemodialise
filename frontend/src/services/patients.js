const nameOrder = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export function sortPatients(patients) {
  return [...patients].sort((a, b) => {
    const left = (a.nome_paciente || '').trim();
    const right = (b.nome_paciente || '').trim();
    if (!left && right) return 1;
    if (left && !right) return -1;
    return nameOrder.compare(left, right) || nameOrder.compare(String(a.cd_paciente), String(b.cd_paciente));
  });
}
