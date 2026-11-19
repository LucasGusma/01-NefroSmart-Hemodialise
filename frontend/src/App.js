import Button from './components/Button';
import React from 'react';
import './App.css';
import './login-page.css';
import './interface.css';
import './manual-standard.css';
import Pagination, { PAGE_SIZE } from './components/Pagination';
import SiteFooter from './components/SiteFooter';
import { sortPatients } from './services/patients';
import { apiFetch as fetch } from './services/api';
import SearchIcon from './components/SearchIcon';
import LoadingOverlay from './components/LoadingOverlay';
import ConfirmationModal from './components/ConfirmationModal';
import SearchModal from './components/SearchModal';
import ActiveSearchModal from './components/ActiveSearchModal';
import LoginScreen from './components/LoginScreen';
import NefroSmartHeader from './components/NefroSmartHeader';
import PatientSignaturesPage from './components/PatientSignaturesPage';
import FastPassSidebar from './components/FastPassSidebar';
import {
  getStoredThemeChoice,
  setStoredThemeChoice,
  resolveEffectiveTheme,
  getStoredSidebarMode,
  setStoredSidebarMode,
} from './services/themePreferences';

export default function App() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [pacientes, setPacientes] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [formError, setFormError] = React.useState('');
  const [filterText, setFilterText] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState({ isOpen: false, type: null });
  const [f9Action, setF9Action] = React.useState(null);
  const [focusedField, setFocusedField] = React.useState(null);
  const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, patientId: null });
  const [modalState, setModalState] = React.useState({
    isOpen: false, title: '', data: [], targetCodeField: '',
    targetNameField: '', codeField: '', nameField: '',
    isLoading: false, error: null,
  });
  const [formState, setFormState] = React.useState({
    cd_paciente: '', nome_paciente: '', cd_turma: '', nome_turma: '',
    dt_inicio_vigencia: '', dt_fim_vigencia: '', sn_ativo: 'S',
    cd_procedimento: '', nome_procedimento: '', cd_procedimento_sus: '', nome_procedimento_sus: '',
    cd_prestador: '', nome_prestador: '', cd_convenio: '', nome_convenio: '',
    cd_con_plan: '', nome_con_plan: '', cd_sub_plano: '', nome_sub_plano: '',
    cd_ori_ate: '', nome_ori_ate: '', cd_ser_dis: '', nome_ser_dis: '',
    cd_tip_mar: '', nome_tip_mar: '', cd_cid: '', nome_cid: '',
    cd_cbo_prestador: '', nome_cbo_prestador: '', cd_loc_proced: '', nome_loc_proced: '',
    cd_tipo_internacao: '', nome_tipo_internacao: '', cd_especialid: '', nome_especialid: '',
    ds_acesso: '', sn_atendimento_apac: 'S',
  });
  const [isEditing, setIsEditing] = React.useState(false);
  const [isFormVisible, setIsFormVisible] = React.useState(false);
  const [isSignaturesVisible, setIsSignaturesVisible] = React.useState(false);

  // Estados do Padrão FastPass v3.0: Tema (Seguir o sistema, Claro, Escuro, Baleia) e Modo da Lateral
  const [themeChoice, setThemeChoice] = React.useState('system');
  const [effectiveTheme, setEffectiveTheme] = React.useState(() => resolveEffectiveTheme('system'));
  const [sidebarMode, setSidebarMode] = React.useState('preview');

  // Indicadores Reais da Lateral (HOJE, TOTAL HISTÓRICO, ÚLT.) — Capítulos 26, 49 e 56
  const [sidebarStats, setSidebarStats] = React.useState({
    loading: true,
    todayCount: null,
    error: false,
    lastSignatureTime: '--:--',
    lastSignatureFull: 'Sem registro hoje',
  });

  // Inicialização de sessão via JWT
  React.useEffect(() => {
    const tokenFromStorage = localStorage.getItem('authToken');
    const userDataFromStorage = localStorage.getItem('userData');

    if (tokenFromStorage && userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
        const savedTheme = getStoredThemeChoice(parsedUser);
        setThemeChoice(savedTheme);
        setEffectiveTheme(resolveEffectiveTheme(savedTheme));
        setSidebarMode(getStoredSidebarMode(parsedUser));
      } catch (e) {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Acompanha mudanças de tema do sistema operacional quando em modo 'system' (Cap. 04 e 25)
  React.useEffect(() => {
    setEffectiveTheme(resolveEffectiveTheme(themeChoice));
    if (themeChoice !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setEffectiveTheme(resolveEffectiveTheme('system'));
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [themeChoice]);

  const handleChangeTheme = React.useCallback((nextChoice) => {
    const valid = setStoredThemeChoice(currentUser, nextChoice);
    setThemeChoice(valid);
    setEffectiveTheme(resolveEffectiveTheme(valid));
  }, [currentUser]);

  const handleChangeSidebarMode = React.useCallback((nextMode) => {
    const valid = setStoredSidebarMode(currentUser, nextMode);
    setSidebarMode(valid);
  }, [currentUser]);

  const handleLogout = React.useCallback(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('demoMode');
      setIsEditing(false);
      setIsFormVisible(false);
      setIsSignaturesVisible(false);
      setFormState({ sn_ativo: 'S', sn_atendimento_apac: 'S', dt_inicio_vigencia: '', dt_fim_vigencia: '' });
      setPacientes([]);
      setError(null);
      localStorage.removeItem('userData');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setSidebarStats({ loading: true, todayCount: null, error: false });
      setConfirmModal({ isOpen: false, patientId: null });
      setActiveSearch({ isOpen: false, type: null });
      setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  // Lógica RBAC
  const isAdmin = currentUser?.perfis?.includes('ADMIN') || currentUser?.perfis?.includes('MASTER') || currentUser?.perfis?.includes('940');

  const API_BASE_URL = '/api';

  const fetchPacientes = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/pacientes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
             handleLogout();
             return;
          }
          throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      setPacientes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar a lista de pacientes:", error);
      setError("Não foi possível carregar os dados dos pacientes. Verifique se o backend está a funcionar.");
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, handleLogout]);

  const fetchSidebarIndicators = React.useCallback(async () => {
    if (!isAuthenticated) return;
    setSidebarStats(prev => ({ ...prev, loading: true, error: false }));
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const mesIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mesFormatado = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    try {
      // 1. Estatísticas agregadas do mês corrente (banco SQLite ou demo)
      let monthTotal = 0;
      try {
        const resStats = await fetch(`${API_BASE_URL}/assinaturas/estatisticas-mes?mes=${mesIso}`);
        if (resStats.ok) {
          const statsData = await resStats.json();
          if (statsData?.por_dia && typeof statsData.por_dia === 'object') {
            monthTotal = Object.values(statsData.por_dia).reduce((acc, v) => acc + (Number(v) || 0), 0);
          }
        }
      } catch (_) {}

      // 2. Assinaturas detalhadas do mês ou do dia de hoje
      let todayCount = 0;
      let lastTime = '--:--';
      let lastFull = 'Sem registro hoje';
      let detailedMonthCount = 0;

      try {
        const resMes = await fetch(`${API_BASE_URL}/assinaturas?mes=${mesIso}`);
        if (resMes.ok) {
          const listMes = await resMes.json();
          if (Array.isArray(listMes)) {
            const presentMonth = listMes.filter((r) => r.status === 'COMPARECIDO' || r.sn_assinado === 'S');
            const presentToday = presentMonth.filter((r) => r.data === todayIso);
            detailedMonthCount = presentMonth.length;
            todayCount = presentToday.length;
            if (presentToday.length > 0) {
              const latest = [...presentToday].sort((a, b) => String(a.hora_registro || '').localeCompare(String(b.hora_registro || ''))).at(-1);
              const rawHr = String(latest.hora_registro || '');
              lastTime = rawHr.length >= 5 ? rawHr.slice(0, 5) : (rawHr || '--:--');
              lastFull = latest.dt_registro || `${todayIso.split('-').reverse().join('/')} ${rawHr}`;
            }
          }
        }
      } catch (_) {}

      // 3. Fallback adicional para o dia de hoje se resMes não retornou itens de hoje
      if (todayCount === 0) {
        try {
          const resToday = await fetch(`${API_BASE_URL}/assinaturas?data=${todayIso}`);
          if (resToday.ok) {
            const listToday = await resToday.json();
            if (Array.isArray(listToday)) {
              const presentToday = listToday.filter((r) => r.status === 'COMPARECIDO' || r.sn_assinado === 'S');
              todayCount = presentToday.length;
              if (presentToday.length > 0) {
                const latest = [...presentToday].sort((a, b) => String(a.hora_registro || '').localeCompare(String(b.hora_registro || ''))).at(-1);
                const rawHr = String(latest.hora_registro || '');
                lastTime = rawHr.length >= 5 ? rawHr.slice(0, 5) : (rawHr || '--:--');
                lastFull = latest.dt_registro || `${todayIso.split('-').reverse().join('/')} ${rawHr}`;
              }
            }
          }
        } catch (_) {}
      }

      const finalMonthTotal = Math.max(monthTotal, detailedMonthCount, todayCount);

      setSidebarStats({
        loading: false,
        error: false,
        todayCount,
        monthCount: finalMonthTotal,
        totalHistorical: finalMonthTotal,
        currentMonthLabel: mesFormatado,
        lastSignatureTime: lastTime,
        lastSignatureFull: lastFull,
      });
    } catch (e) {
      setSidebarStats(prev => ({
        ...prev,
        loading: false,
        error: false,
        todayCount: prev.todayCount ?? 0,
        monthCount: prev.monthCount ?? 0,
        totalHistorical: prev.totalHistorical ?? 0,
        currentMonthLabel: mesFormatado,
      }));
    }
  }, [API_BASE_URL, isAuthenticated]);

  React.useEffect(() => {
    if (isAuthenticated) {
        fetchPacientes();
        fetchSidebarIndicators();
    }
    const onSigUpdate = () => { fetchSidebarIndicators(); };
    window.addEventListener('nefrosmart:signatures-changed', onSigUpdate);
    return () => window.removeEventListener('nefrosmart:signatures-changed', onSigUpdate);
  }, [isAuthenticated, fetchPacientes, fetchSidebarIndicators]);

  React.useEffect(() => {
    document.title = 'NefroSmart';
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'F9' && typeof f9Action === 'function') {
        event.preventDefault();
        f9Action();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [f9Action]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const valorFinal = type === 'checkbox' ? (checked ? 'S' : 'N') : value;
    setFormState({ ...formState, [name]: valorFinal });
  };

  const handleCodeBlur = async (event, nameField, endpoint) => {
    setF9Action(null);
    const code = event.target.value;
    if (!code) {
      setFormState(prevState => ({ ...prevState, [nameField]: '' }));
      return;
    }
    setFormState(prevState => ({ ...prevState, [nameField]: 'Buscando...' }));
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const data = await response.json();
      const description = data.nome || data.descricao || "Não encontrado";
      setFormState(prevState => ({ ...prevState, [nameField]: description }));
    } catch (error) {
      console.error(`Erro ao buscar ${nameField}:`, error);
      setFormState(prevState => ({ ...prevState, [nameField]: 'Erro na busca' }));
    }
  };

  const handleOpenSearchModal = async (config) => {
    setModalState({
      isOpen: true, title: `A carregar ${config.title}...`, data: [],
      isLoading: true, error: null, targetCodeField: config.targetCodeField,
      targetNameField: config.targetNameField, codeField: config.codeField,
      nameField: config.nameField
    });

    try {
      const response = await fetch(`${API_BASE_URL}/lookup/${config.endpoint}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar dados para a busca.');
      const lookupData = await response.json();
      setModalState(prevState => ({
        ...prevState, title: config.title, data: lookupData, isLoading: false,
      }));
    } catch (err) {
      setModalState(prevState => ({
        ...prevState, title: config.title, isLoading: false,
        error: "Não foi possível carregar os dados. Verifique com o administrador do sistema."
      }));
    }
  };

  const handleCloseModal = () => {
    setModalState({ ...modalState, isOpen: false });
    setTimeout(() => document.querySelector(`input[name="${focusedField}"]`)?.focus(), 0);
  };

  const handleModalSelect = (item) => {
    setFormState(prevState => ({
      ...prevState,
      [modalState.targetCodeField]: item[modalState.codeField],
      [modalState.targetNameField]: item[modalState.nameField]
    }));
    handleCloseModal();
  };

  const handleActiveSearchSelect = (item, codeField, nameField) => {
    setFormState(prevState => ({
      ...prevState,
      [codeField]: item[codeField],
      [nameField]: item[nameField]
    }));
    setActiveSearch({ isOpen: false, type: null });
    setTimeout(() => document.querySelector(`input[name="${focusedField}"]`)?.focus(), 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const url = isEditing
      ? `${API_BASE_URL}/pacientes/${formState.cd_paciente}`
      : `${API_BASE_URL}/pacientes`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formState),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }
      const result = await response.json();
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
      fetchPacientes();
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      setError(`Falha ao salvar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (paciente) => {
    setIsSignaturesVisible(false);
    setIsFormVisible(true);
    setIsEditing(true);
    const dadosPacienteParaForm = {
      ...paciente,
      dt_inicio_vigencia: paciente.dt_inicio_vigencia ? new Date(paciente.dt_inicio_vigencia).toISOString().split('T')[0] : '',
      dt_fim_vigencia: paciente.dt_fim_vigencia ? new Date(paciente.dt_fim_vigencia).toISOString().split('T')[0] : '',
    };
    setFormState(dadosPacienteParaForm);
  };

  const handleDelete = (cd_paciente) => {
    setConfirmModal({ isOpen: true, patientId: cd_paciente });
  };

  const executeDelete = async () => {
    const cd_paciente = confirmModal.patientId;
    if (!cd_paciente) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/pacientes/${cd_paciente}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }
      const result = await response.json();
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchPacientes();
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      setError(`Falha ao excluir: ${error.message}`);
    } finally {
      setConfirmModal({ isOpen: false, patientId: null });
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setIsFormVisible(false);
    setIsSignaturesVisible(false);
    setFormState({
      cd_paciente: '', nome_paciente: '', cd_turma: '', nome_turma: '',
      dt_inicio_vigencia: '', dt_fim_vigencia: '', sn_ativo: 'S',
      cd_procedimento: '', nome_procedimento: '', cd_procedimento_sus: '', nome_procedimento_sus: '',
      cd_prestador: '', nome_prestador: '', cd_convenio: '', nome_convenio: '',
      cd_con_plan: '', nome_con_plan: '', cd_sub_plano: '', nome_sub_plano: '',
      cd_ori_ate: '', nome_ori_ate: '', cd_ser_dis: '', nome_ser_dis: '',
      cd_tip_mar: '', nome_tip_mar: '', cd_cid: '', nome_cid: '',
      cd_cbo_prestador: '', nome_cbo_prestador: '', cd_loc_proced: '', nome_loc_proced: '',
      cd_tipo_internacao: '', nome_tipo_internacao: '', cd_especialid: '', nome_especialid: '',
      ds_acesso: '', sn_atendimento_apac: 'S',
    });
  };

  const filteredPacientes = sortPatients(pacientes).filter(paciente =>
    (paciente.nome_paciente && paciente.nome_paciente.toLowerCase().includes(filterText.toLowerCase())) ||
    String(paciente.cd_paciente).includes(filterText)
  );

  const activePatientsCount = React.useMemo(
    () => pacientes.filter((p) => String(p.sn_ativo || 'S').toUpperCase() !== 'N').length,
    [pacientes]
  );

  const pageCount = Math.max(1, Math.ceil(filteredPacientes.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePatients = filteredPacientes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  React.useEffect(() => { setPage(1); }, [filterText]);
  React.useEffect(() => { setPage(previous => Math.min(previous, pageCount)); }, [pageCount]);

  const handleSelectSidebarSection = (section) => {
    if (section === 'signatures') {
      setIsFormVisible(false);
      setIsSignaturesVisible(true);
    } else if (section === 'form') {
      setIsSignaturesVisible(false);
      setIsEditing(false);
      setIsFormVisible(true);
    } else {
      setIsFormVisible(false);
      setIsSignaturesVisible(false);
    }
  };

  const activeSection = isSignaturesVisible ? 'signatures' : isFormVisible ? 'form' : 'patients';

  const renderInputFieldWithSearch = (label, codeFieldName, nameFieldName, endpoint, config = {}) => {
    const { isRequired = false, inputType = 'number', dependencies = [], activeSearch = false } = config;
    const selectedDesc = formState[nameFieldName] || '';
    const showFullReference = selectedDesc && selectedDesc.length > 26 && selectedDesc !== 'Buscando...';

    const handleSearchClick = () => {
      if (activeSearch) {
        setActiveSearch({ isOpen: true, type: endpoint });
      } else {
        let finalEndpoint = endpoint;
        if (dependencies.length > 0) {
          const missingDep = dependencies.find(dep => !formState[dep]);
          if (missingDep) {
            setFormError(`Por favor, preencha o campo '${missingDep}' primeiro.`);
            setTimeout(() => setFormError(''), 5000);
            return;
          }
          const depValues = dependencies.map(dep => formState[dep]).join('/');
          finalEndpoint = `${endpoint}/${depValues}`;
        }
        handleOpenSearchModal({
          title: `Selecionar ${label.replace('Cód. ', '')}`,
          endpoint: finalEndpoint,
          targetCodeField: codeFieldName,
          targetNameField: nameFieldName,
          codeField: codeFieldName,
          nameField: nameFieldName
        });
      }
    };

    return (
      <>
        <div className="md:col-span-1">
          <label htmlFor={codeFieldName} className="block text-sm font-medium text-azul-escuro mb-1">{label}{isRequired ? ' *' : ''}</label>
          <div className="flex items-center">
            <input
              type={inputType}
              name={codeFieldName}
              value={formState[codeFieldName] || ''}
              onChange={handleInputChange}
              onFocus={() => {
                setF9Action(() => handleSearchClick);
                setFocusedField(codeFieldName);
              }}
              onBlur={(e) => {
                setF9Action(null);
                let finalEndpoint = `${endpoint}/${e.target.value}`;
                if (endpoint === 'plano') finalEndpoint = `plano/${formState.cd_convenio}/${e.target.value}`;
                if (endpoint === 'sub_plano') finalEndpoint = `sub_plano/${formState.cd_convenio}/${formState.cd_con_plan}/${e.target.value}`;
                handleCodeBlur(e, nameFieldName, finalEndpoint);
              }}
              required={isRequired}
              disabled={isEditing && codeFieldName === 'cd_paciente'}
              className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none disabled:bg-gray-200"
            />
            <Button
              type="button"
              onClick={handleSearchClick}
              disabled={isEditing && codeFieldName === 'cd_paciente'}
              className="p-2 bg-azul-medio rounded-r-lg hover:bg-opacity-90 disabled:bg-gray-400"
            >
              <SearchIcon />
            </Button>
          </div>
        </div>
        <div className="md:col-span-3">
          <label htmlFor={nameFieldName} className="block text-sm font-medium text-azul-escuro mb-1">{label.replace('Cód. ', '')}</label>
          <input type="text" name={nameFieldName} value={selectedDesc} disabled readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-200" />
          {/* Complemento de referência completa em verde discreto (Capítulo 11 do Manual FastPass v3.0) */}
          {showFullReference && (
            <div className="fp-full-reference-hint" aria-hidden="true">
              {selectedDesc}
            </div>
          )}
        </div>
      </>
    );
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          const savedTheme = getStoredThemeChoice(user);
          setThemeChoice(savedTheme);
          setEffectiveTheme(resolveEffectiveTheme(savedTheme));
          setSidebarMode(getStoredSidebarMode(user));
        }}
      />
    );
  }

  return (
    <div className="app-shell" data-theme={effectiveTheme} data-theme-choice={themeChoice}>
      {isSubmitting && <LoadingOverlay />}
      <style>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, patientId: null })}
        onConfirm={executeDelete}
        title="Confirmar Exclusão"
      >
        <p>Tem certeza que deseja excluir este paciente?</p>
      </ConfirmationModal>

      {activeSearch.isOpen && activeSearch.type === 'paciente' && (
        <ActiveSearchModal
          title="Selecionar Paciente"
          searchPlaceholder="Digite o nome do paciente..."
          searchEndpoint="paciente"
          codeField="cd_paciente"
          nameField="nome_paciente"
          onSelect={(item) => handleActiveSearchSelect(item, 'cd_paciente', 'nome_paciente')}
          onClose={() => {
            setActiveSearch({ isOpen: false, type: null });
            setTimeout(() => document.querySelector(`input[name="${focusedField}"]`)?.focus(), 0);
          }}
        />
      )}
      {activeSearch.isOpen && activeSearch.type === 'prestador' && (
        <ActiveSearchModal
          title="Selecionar Prestador"
          searchPlaceholder="Digite o nome do prestador..."
          searchEndpoint="prestador"
          codeField="cd_prestador"
          nameField="nome_prestador"
          onSelect={(item) => handleActiveSearchSelect(item, 'cd_prestador', 'nome_prestador')}
          onClose={() => {
            setActiveSearch({ isOpen: false, type: null });
            setTimeout(() => document.querySelector(`input[name="${focusedField}"]`)?.focus(), 0);
          }}
        />
      )}

      {modalState.isOpen && (
        <SearchModal {...modalState} onSelect={handleModalSelect} onClose={handleCloseModal} />
      )}

      <div
        className={`fp-authenticated-layout sidebar-${sidebarMode} min-h-screen font-sans text-azul-escuro`}
        data-theme={effectiveTheme}
        data-theme-choice={themeChoice}
      >
        {/* Barra Lateral FastPass v3.0 com 3 modos persistentes e indicadores reais */}
        <FastPassSidebar
          sidebarMode={sidebarMode}
          onChangeSidebarMode={handleChangeSidebarMode}
          activeSection={activeSection}
          onSelectSection={handleSelectSidebarSection}
          isAdmin={isAdmin}
          onRefresh={() => {
            fetchPacientes();
            fetchSidebarIndicators();
          }}
          onLogout={handleLogout}
          stats={{
            loading: sidebarStats.loading,
            error: sidebarStats.error,
            patientCount: isLoading || error ? null : pacientes.length,
            activePatients: isLoading || error ? null : activePatientsCount,
            todayCount: sidebarStats.todayCount,
            totalHistorical: sidebarStats.monthCount ?? sidebarStats.totalHistorical,
            monthCount: sidebarStats.monthCount,
            currentMonthLabel: sidebarStats.currentMonthLabel,
            lastSignatureTime: sidebarStats.lastSignatureTime,
            lastSignatureFull: sidebarStats.lastSignatureFull,
            envLabel: currentUser?.demo ? 'DEMO' : 'PRD',
          }}
        />

        <div className="fp-main-workspace">
          <NefroSmartHeader
            user={currentUser}
            onLogout={handleLogout}
            themeChoice={themeChoice}
            onChangeTheme={handleChangeTheme}
            sidebarMode={sidebarMode}
            onChangeSidebarMode={handleChangeSidebarMode}
          />

          <div className="container fp-workspace-content mx-auto p-4 md:p-6">
            {successMessage && <div className="fp-alert fp-alert-success mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg">{successMessage}</div>}
            {error && <div className="fp-alert fp-alert-error mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

            {!isFormVisible && !isSignaturesVisible && (
              <div className="fp-workspace-tabs flex flex-wrap items-center gap-3 mb-5" role="navigation" aria-label="Ações principais do módulo">
                {isAdmin && (
                  <Button onClick={() => setIsFormVisible(true)} className="fp-cta-primary">
                    Adicionar Novo Paciente
                  </Button>
                )}
                <Button onClick={() => setIsSignaturesVisible(true)} className="fp-action-tab">
                  Assinatura dos Pacientes
                </Button>
              </div>
            )}

            {isSignaturesVisible && (
              <PatientSignaturesPage
                onBack={() => {
                  setIsSignaturesVisible(false);
                  fetchSidebarIndicators();
                }}
                pacientes={pacientes}
                onRefreshPacientes={() => {
                  fetchPacientes();
                  fetchSidebarIndicators();
                }}
                currentUser={currentUser}
              />
            )}

            {isFormVisible && (
              <div className="fp-surface-panel bg-cinza-claro p-6 md:p-8 rounded-xl shadow-lg mb-8">
                <h2 className="text-2xl font-bold mb-6 text-azul-escuro">{isEditing ? 'Editar Paciente' : 'Adicionar Novo Paciente'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                    {formError && <div className="md:col-span-4 p-3 mb-2 text-sm text-yellow-800 bg-yellow-100 rounded-lg">{formError}</div>}
                    {renderInputFieldWithSearch('Cód. Paciente', 'cd_paciente', 'nome_paciente', 'paciente', { isRequired: true, activeSearch: true })}
                    {renderInputFieldWithSearch('Cód. Turma', 'cd_turma', 'nome_turma', 'turma', { isRequired: true })}
                    {renderInputFieldWithSearch('Cód. Procedimento', 'cd_procedimento', 'nome_procedimento', 'procedimento', { inputType: 'text' })}
                    {renderInputFieldWithSearch('Cód. Procedimento SUS', 'cd_procedimento_sus', 'nome_procedimento_sus', 'procedimento_sus', { inputType: 'text' })}
                    {renderInputFieldWithSearch('Cód. Prestador', 'cd_prestador', 'nome_prestador', 'prestador', { activeSearch: true })}
                    {renderInputFieldWithSearch('Cód. Convênio', 'cd_convenio', 'nome_convenio', 'convenio')}
                    {renderInputFieldWithSearch('Cód. Plano', 'cd_con_plan', 'nome_con_plan', 'plano', { dependencies: ['cd_convenio'] })}
                    {renderInputFieldWithSearch('Cód. Sub-plano', 'cd_sub_plano', 'nome_sub_plano', 'sub_plano', { dependencies: ['cd_convenio', 'cd_con_plan'] })}
                    {renderInputFieldWithSearch('Cód. Origem Atend.', 'cd_ori_ate', 'nome_ori_ate', 'origem')}
                    {renderInputFieldWithSearch('Cód. Serviço', 'cd_ser_dis', 'nome_ser_dis', 'servico_diagnostico')}
                    {renderInputFieldWithSearch('Cód. Tipo Atend.', 'cd_tip_mar', 'nome_tip_mar', 'tipo_marcacao')}
                    {renderInputFieldWithSearch('Cód. CID', 'cd_cid', 'nome_cid', 'cid', { inputType: 'text' })}
                    {renderInputFieldWithSearch('Cód. CBO', 'cd_cbo_prestador', 'nome_cbo_prestador', 'cbo', { inputType: 'text' })}
                    {renderInputFieldWithSearch('Cód. Local Proced.', 'cd_loc_proced', 'nome_loc_proced', 'local_procedimento')}
                    {renderInputFieldWithSearch('Cód. Tipo Paciente', 'cd_tipo_internacao', 'nome_tipo_internacao', 'tipo_internacao')}
                    {renderInputFieldWithSearch('Cód. Especialidade', 'cd_especialid', 'nome_especialid', 'especialidade')}
                    <div className="md:col-span-4">
                      <label htmlFor="ds_acesso" className="block text-sm font-medium text-azul-escuro mb-1">Descrição de Acesso</label>
                      <textarea name="ds_acesso" value={formState.ds_acesso || ''} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                    <div className="md:col-span-2"><label htmlFor="dt_inicio_vigencia" className="block text-sm font-medium text-azul-escuro mb-1">Início Vigência *</label><input type="date" name="dt_inicio_vigencia" value={formState.dt_inicio_vigencia} onChange={handleInputChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div className="md:col-span-2"><label htmlFor="dt_fim_vigencia" className="block text-sm font-medium text-azul-escuro mb-1">Fim Vigência</label><input type="date" name="dt_fim_vigencia" value={formState.dt_fim_vigencia} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                  <div className="flex justify-end gap-4 mt-8">
                    <Button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-300 text-azul-escuro font-semibold rounded-lg hover:bg-gray-400">Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting} className="fp-cta-emerald px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                      {isSubmitting ? 'Processando...' : (isEditing ? 'Salvar Alterações' : 'Adicionar Paciente')}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {!isFormVisible && !isSignaturesVisible && (
              <>
                <div className="mb-4">
                  <label htmlFor="filter" className="block text-sm font-medium text-azul-escuro mb-1">Filtrar por Código ou Nome do Paciente:</label>
                  <div className="patient-search" role="search">
                    <input
                      type="text"
                      id="filter"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="patient-search-input"
                      placeholder="Pesquisar paciente..."
                    />
                    <Button type="button" aria-label="Pesquisar pacientes" onClick={() => document.getElementById('filter')?.focus()}>
                      <SearchIcon />
                    </Button>
                  </div>
                </div>
                <div className="patients-panel fp-surface-panel">
                  <p className="fp-table-hint">Role a tabela horizontalmente para consultar todas as colunas.</p>
                  <div className="patients-table-container" tabIndex={0} role="region" aria-label="Lista de pacientes, com rolagem horizontal">
                    <table className="patients-table w-full text-sm text-left text-azul-escuro">
                      <thead className="table-heading text-xs text-azul-escuro uppercase border-b">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-center">Ações</th>
                          <th scope="col" className="px-6 py-3">Paciente</th>
                          <th scope="col" className="px-6 py-3">Ativo</th>
                          <th scope="col" className="px-6 py-3">Turma</th>
                          <th scope="col" className="px-6 py-3">Prestador</th>
                          <th scope="col" className="px-6 py-3">Especialidade</th>
                          <th scope="col" className="px-6 py-3">Convênio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading && <tr><td colSpan="7" className="text-center py-8 text-gray-500">A carregar dados...</td></tr>}
                        {error && <tr><td colSpan="7" className="text-center py-8 text-red-500">{error}</td></tr>}
                        {!isLoading && !error && visiblePatients.map((paciente) => (
                          <tr key={paciente.cd_paciente} className="bg-white border-b hover:bg-cinza-claro">
                            <td data-label="Ações" className="px-6 py-4">
                              {isAdmin ? (
                                  <div className="patient-actions flex items-center justify-center gap-2">
                                    <Button onClick={() => handleEdit(paciente)} className="fp-btn-edit p-2 text-azul-medio bg-azul-claro rounded-lg hover:bg-opacity-80">Editar</Button>
                                    <Button onClick={() => handleDelete(paciente.cd_paciente)} className="fp-btn-delete p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200">Excluir</Button>
                                  </div>
                              ) : (
                                  <span className="text-gray-400 text-xs text-center block">Sem permissão</span>
                              )}
                            </td>
                            <td data-label="Paciente" className="patient-identity px-6 py-4">
                              <strong className="fp-ref-link">{paciente.nome_paciente || 'N/A'}</strong>
                              <small>Código: {paciente.cd_paciente}</small>
                            </td>
                            <td data-label="Ativo" className="px-6 py-4">
                              <span className={paciente.sn_ativo === 'S' ? 'fp-status-active' : 'fp-status-inactive'}>
                                {paciente.sn_ativo === 'S' ? 'Sim' : 'Não'}
                              </span>
                            </td>
                            <td data-label="Turma" className="px-6 py-4">{paciente.nome_turma || 'N/A'}</td>
                            <td data-label="Prestador" className="px-6 py-4">{paciente.nome_prestador || 'N/A'}</td>
                            <td data-label="Especialidade" className="px-6 py-4">{paciente.nome_especialid || 'N/A'}</td>
                            <td data-label="Convênio" className="px-6 py-4">{paciente.nome_convenio || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!isLoading && !error && <Pagination page={currentPage} total={filteredPacientes.length} onChange={setPage} />}
                </div>
              </>
            )}
          </div>

          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
