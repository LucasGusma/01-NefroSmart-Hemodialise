// Dados fictícios; nenhuma requisição deste módulo chega ao servidor.
const catalogs = {
  paciente: ['cd_paciente', 'nome_paciente', [[1001, 'Ana Exemplo'], [1002, 'Carlos Demonstração'], [1003, 'Mariana Teste'], [1004, 'Pedro Exemplo']]],
  turma: ['cd_turma', 'nome_turma', [[1, 'Seg / Qua / Sex — Manhã'], [2, 'Ter / Qui / Sáb — Tarde']]],
  prestador: ['cd_prestador', 'nome_prestador', [[101, 'Prestador de demonstração']]],
  convenio: ['cd_convenio', 'nome_convenio', [[1, 'SUS — demonstração']]],
  plano: ['cd_con_plan', 'nome_con_plan', [[1, 'Plano padrão']]],
  sub_plano: ['cd_sub_plano', 'nome_sub_plano', [[1, 'Subplano padrão']]],
  procedimento: ['cd_procedimento', 'nome_procedimento', [['0305010115', 'Hemodiálise — demonstração']]],
  procedimento_sus: ['cd_procedimento_sus', 'nome_procedimento_sus', [['0305010115', 'Hemodiálise — demonstração']]],
  origem: ['cd_ori_ate', 'nome_ori_ate', [[1, 'Ambulatório']]],
  servico_diagnostico: ['cd_ser_dis', 'nome_ser_dis', [[1, 'Nefrologia']]],
  tipo_marcacao: ['cd_tip_mar', 'nome_tip_mar', [[1, 'Agendado']]],
  cid: ['cd_cid', 'nome_cid', [['N189', 'Exemplo de diagnóstico']]],
  cbo: ['cd_cbo_prestador', 'nome_cbo_prestador', [['225109', 'Nefrologista']]],
  local_procedimento: ['cd_loc_proced', 'nome_loc_proced', [[1, 'Ambulatório']]],
  tipo_internacao: ['cd_tipo_internacao', 'nome_tipo_internacao', [[1, 'Ambulatorial']]],
  especialidade: ['cd_especialid', 'nome_especialid', [[1, 'Nefrologia']]],
};
const initialPatients = catalogs.paciente[2].slice(0, 3).map(([id, name], index) => ({
  cd_paciente: id, nome_paciente: name, cd_turma: index % 2 + 1,
  nome_turma: catalogs.turma[2][index % 2][1], sn_ativo: 'S',
  dt_inicio_vigencia: '2026-09-01', dt_fim_vigencia: '',
  cd_prestador: 101, nome_prestador: 'Prestador de demonstração',
  cd_especialid: 1, nome_especialid: 'Nefrologia',
  cd_convenio: 1, nome_convenio: 'SUS — demonstração', sn_atendimento_apac: 'S',
}));
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
function readPatients() {
  try { return JSON.parse(localStorage.getItem('demoPatients')) || initialPatients; }
  catch { return initialPatients; }
}
export async function demoRequest(url, options = {}) {
  const parsed = new URL(url, window.location.origin);
  const parts = parsed.pathname.replace(/^\/api\//, '').split('/');
  const method = options.method || 'GET';
  if (parts[0] === 'pacientes') {
    const patients = readPatients();
    if (method === 'GET') return response(patients);
    const id = Number(parts[1]);
    if (method === 'DELETE') {
      localStorage.setItem('demoPatients', JSON.stringify(patients.filter(p => Number(p.cd_paciente) !== id)));
      return response({ message: 'Paciente fictício excluído.' });
    }
    const patient = JSON.parse(options.body || '{}');
    if (method === 'POST' && patients.some(p => Number(p.cd_paciente) === Number(patient.cd_paciente))) return response({ error: 'Paciente já cadastrado na demonstração.' }, 409);
    const next = method === 'PUT' ? patients.map(p => Number(p.cd_paciente) === id ? patient : p) : [...patients, patient];
    localStorage.setItem('demoPatients', JSON.stringify(next));
    return response({ message: 'Dados fictícios salvos neste navegador. Nenhuma agenda real foi gerada.' });
  }
  if (parts[0] === 'assinaturas') {
    let signatures = {};
    try { 
      signatures = JSON.parse(localStorage.getItem('demoSignatures') || '{}');
      if (Object.keys(signatures).length === 0) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}`;
        // Demo default signatures for visual realism
        signatures[`${todayIso}_1_101`] = { id: `${todayIso}_1_101`, data: todayIso, horario_id: 1, cd_paciente: 101, nome_paciente: 'MARIA SILVA DEMO', status: 'COMPARECIDO', hora_registro: '08:15:00', dt_registro: `${todayIso} 08:15` };
        signatures[`${todayIso}_2_102`] = { id: `${todayIso}_2_102`, data: todayIso, horario_id: 2, cd_paciente: 102, nome_paciente: 'JOSE PEREIRA DEMO', status: 'COMPARECIDO', hora_registro: '11:42:00', dt_registro: `${todayIso} 11:42` };
        localStorage.setItem('demoSignatures', JSON.stringify(signatures));
      }
    } catch {}
    if (parts[1] === 'estatisticas-mes') {
      const mesParam = parsed.searchParams.get('mes') || new Date().toISOString().slice(0, 7);
      const por_dia = {};
      Object.values(signatures).forEach(s => {
        if (s.data && s.data.startsWith(mesParam) && s.status === 'COMPARECIDO') {
          por_dia[s.data] = (por_dia[s.data] || 0) + 1;
        }
      });
      return response({ mes: mesParam, por_dia });
    }
    if (method === 'GET') {
      const dataParam = parsed.searchParams.get('data');
      const mesParam = parsed.searchParams.get('mes');
      let list = Object.values(signatures);
      if (dataParam) list = list.filter(s => s.data === dataParam);
      if (mesParam) list = list.filter(s => s.data && s.data.startsWith(mesParam));
      return response(list);
    }
    if (method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const recordId = `${body.data}_${body.horario_id}_${body.cd_paciente}`;
      const record = { ...body, id: recordId };
      signatures[recordId] = record;
      localStorage.setItem('demoSignatures', JSON.stringify(signatures));
      return response({ message: 'Assinatura registrada com sucesso.', registro: record }, 201);
    }
    if (method === 'DELETE') {
      const id = parts[1];
      delete signatures[id];
      localStorage.setItem('demoSignatures', JSON.stringify(signatures));
      return response({ message: 'Registro removido com sucesso.' });
    }
  }
  const lookup = parts[0] === 'lookup';
  const catalog = catalogs[parts[lookup ? 1 : 0]];
  if (!catalog) return response({ error: 'Recurso indisponível na demonstração.' }, 404);
  const [code, name, items] = catalog;
  if (lookup) {
    const query = (parsed.searchParams.get('q') || '').toLocaleLowerCase();
    return response(items.filter(item => item[1].toLocaleLowerCase().includes(query)).map(item => ({ [code]: item[0], [name]: item[1] })));
  }
  const item = items.find(item => String(item[0]) === parts[parts.length - 1]);
  return response({ nome: item ? item[1] : 'Não encontrado' }, item ? 200 : 404);
}
