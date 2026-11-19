# NefroSmart · Gestão Assistencial e Assinatura Digital em Hemodiálise

Sistema web moderno projetado para otimizar o fluxo assistencial em centros de hemodiálise, controle de turmas, confirmação de presença e coleta de assinatura eletrônica de pacientes e responsáveis com validade jurídica e rastreabilidade total.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** React, HTML5 Canvas (captura vetorial de assinatura touch/stylus), CSS3 moderno responsivo para tablets e desktops.
- **Backend:** Python (Flask), arquitetura modular por serviços e rotas (Blueprints).
- **Banco de Dados:** Conexão nativa com Oracle Database (`python-oracledb` em modo Thick/Thin) e suporte local com dados simulados (*Mock Data* para testes e portfólio).
- **Autenticação:** JWT (JSON Web Tokens) e autenticação centralizada corporativa.
- **Conformidade:** LGPD (Lei Geral de Proteção de Dados), rastreabilidade de integridade criptográfica de assinaturas, conformidade com padrões assistenciais e faturamento SUS/APAC.

---

## 📋 Principais Funcionalidades

1. **Gestão de Sessões e Turmas:** Visualização por turnos, horários e filtragem de pacientes em diálise.
2. **Coleta de Assinatura Digital Touch:** Assinatura em tela de alta resolução para pacientes ou responsáveis legais, com registro de data/hora, tipo de documento e hash de integridade.
3. **Controle de Dialisadores:** Rastreabilidade de reuso de capilares/dialisadores, registro de lote e controle de conformidade sanitária.
4. **Modo Demonstração Integrado:** Permite navegação completa da aplicação com dados fictícios gerados em memória, sem necessidade de banco Oracle local.
5. **Automação PL/SQL:** Rotinas para sincronização de agendas e fechamento assistencial periódico.

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
- Python 3.10+
- Node.js 18+ e npm

### 1. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python api.py
```
*A API será iniciada em http://localhost:5000.*

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
*Acesse http://localhost:3000 no navegador.*

---

## 🔒 Segurança e Privacidade (LGPD)
Este repositório foi higienizado para portfólio público. Todas as credenciais de produção, segredos de criptografia, IPs de rede interna e informações confidenciais de pacientes foram rigorosamente removidos e substituídos por dados de demonstração (*mock data*).
