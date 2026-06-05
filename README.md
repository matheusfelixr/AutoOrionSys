# 🚗 AutoOrionSys

**Seu carro. Nossa missão.**

Frontend Web para o sistema de gerenciamento de peças automotivas AutoOrion, construído com Angular.

## 📋 Sobre

Interface web completa para:
- ✅ Cadastro de peças automotivas desmontadas
- ✅ Gerenciamento de anúncios Mercado Livre e Shopee
- ✅ Controle de estoque e inventário
- ✅ Dashboard de vendas
- ✅ Autenticação via JWT
- ✅ Responsivo e moderno

## 🏗️ Arquitetura

- **Framework:** Angular 15+
- **Gerenciador de pacotes:** npm
- **Linguagem:** TypeScript
- **Styling:** Conforme estrutura do projeto

## Pré-requisitos

- Node.js 16+
- npm 8+
- Angular CLI

## 🛠️ Setup Local

`ash
git clone https://github.com/matheusfelixr/AutoOrionSys.git
cd AutoOrionSys
npm install
ng serve
`

Acesse: **http://localhost:4200**

## 📂 Estrutura do Projeto

`
src/
├── app/
│   ├── components/      # Componentes reutilizáveis
│   ├── services/        # Serviços e requisições à API
│   ├── models/          # Interfaces e tipos TypeScript
│   ├── pages/           # Páginas principais
│   └── guards/          # Guards de autenticação
├── assets/
│   └── brand/           # Logos e assets AutoOrion
├── styles/
│   └── variables.css    # Cores e temas da marca
└── environments/        # Configurações por ambiente
`

## 📡 Conectando à API

Configure a URL da API em src/environments/environment.ts:

`	ypescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
`

## 🎨 Identidade Visual AutoOrion

**Cores Oficiais:**
- **Cinza Grafite:** #3a3a3a
- **Preto Fosco:** #1a1a1a
- **Laranja Queimado:** #d97f3e

**Slogan:** "Seu carro. Nossa missão."

**Estilo da marca:**
- Industrial
- Automotivo
- Moderno
- Profissional
- Técnico
- Minimalista
- Clean

**Tom de voz:** Profissional, direto, técnico e confiável.

## 📦 Scripts Disponíveis

`ash
# Desenvolvimento
ng serve

# Build produção
ng build

# Executar testes
ng test

# Executar testes e2e
ng e2e

# Linter
ng lint
`

## 🚀 Deploy

### Build para produção

`ash
ng build --configuration production
`

Os arquivos compilados estarão em dist/.

---

**AutoOrion** © 2026 - Peças automotivas confiáveis | [Website](https://autoorion.com.br) | [@autoorion](https://instagram.com/autoorion)
