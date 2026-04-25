# 🧭 Bússola para Jerusalém — Roadmap do Projeto

> **© Marcos Fernando — C4 Corporation**  
> Contato: c4corpbeats@gmail.com  
> WhatsApp: https://chat.whatsapp.com/C9KfyK7InB00wJ2jRFDtOr  
> Versão atual: **Service Worker v12** · Atualizado em: 24/04/2026

---

## 📌 Visão Geral
Aplicativo sagrado com tema hebraico antigo que funciona como uma **bússola 3D** 
apontando sempre para **Jerusalém** (31.7683°N, 35.2137°E). Usa GPS + Google Maps 
para orientar o usuário, mostrando direção, distância e mapa interativo.

**Plataformas:** Android (APK) + Web (PWA) + Desktop (Electron)

**Abas:** Bússola · Mapa · Comunidade · Bíblia Interlinear · Estudos · Apoiar · Opções

---

## 🔷 FASE 1 — Aplicativo Android (APK) ✅ CONCLUÍDA

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 1A | Estrutura base do projeto web | ✅ |
| 1B | Tema Hebraico Antigo / Sacro (CSS) | ✅ |
| 1C | Bússola 3D com seta + DeviceOrientation API | ✅ |
| 1D | Integração GPS + Google Static Maps API | ✅ |
| 1E | Cálculo de direção e distância até Jerusalém | ✅ |
| 1F | Sistema de doação via PIX (QR Code real) | ✅ |
| 1G | Player de música hebraica (Web Audio API) | ✅ |
| 1H | Comunidade com Google Sign-In + email auth | ✅ |
| 1I | Ícones PNG gerados (todos os tamanhos) | ✅ |
| 1J | Empacotamento APK com Capacitor | ✅ |
| 1K | Vibração ao alinhar com Jerusalém (±5°) | ✅ |
| 1L | Indicador de calibração da bússola | ✅ |
| 1M | Tema claro/escuro (pergaminho/noturno) | ✅ |
| 1N | Splash animado (Estrela de Davi CSS) | ✅ |
| 1O | 32 salmos/versículos embutidos offline | ✅ |
| 1P | Testes e publicação na Play Store | ⬜ |

---

## 🔷 FASE 2 — Site Web (PWA) ✅ IMPLEMENTADA

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 2A | Service Worker com cache inteligente | ✅ |
| 2B | Manifest PWA completo | ✅ |
| 2C | Estratégia cache-first (assets) + network-first (API) | ✅ |
| 2D | Config de deploy: Vercel + Netlify | ✅ |
| 2E | Deploy efetivo em hospedagem | ⬜ |
| 2F | Domínio personalizado | ⬜ |

---

## 🔷 FASE 3 — Aplicativo Desktop (Electron) ✅ IMPLEMENTADA

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 3A | Configurar projeto Electron (main.js + preload.js) | ✅ |
| 3B | UI adaptada para desktop (janela vertical 420×800) | ✅ |
| 3C | electron-builder configurado (.exe, .dmg, AppImage) | ✅ |
| 3D | Menu nativo com atalhos | ✅ |
| 3E | Gerar instaladores e publicar | ⬜ |

---

## 🔷 FASE 4 — Backend & Autenticação ✅ IMPLEMENTADA

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 4A | API REST completa (posts, comentários, likes, notificações) | ✅ |
| 4B | Autenticação por email (token 6 dígitos via SMTP) | ✅ |
| 4C | Google Sign-In (OAuth 2.0 / Identity Services) | ✅ |
| 4D | Perfis com avatar emoji + bio | ✅ |
| 4E | Config de deploy Render.com (render.yaml + Procfile) | ✅ |
| 4F | Deploy efetivo do backend | ⬜ |

---

## 🔷 FASE 5 — Segurança & Qualidade ✅ IMPLEMENTADA

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 5A | Senhas com bcrypt (substituiu MD5) | ✅ |
| 5B | Rate limiting em todas as rotas sensíveis | ✅ |
| 5C | Nomes de livros em PT-BR nos resultados de busca | ✅ |
| 5D | Modal backdrop (fechar ao clicar fora) | ✅ |
| 5E | Polling de notificações em tempo real | ✅ |
| 5F | Modal real de notificações com leitura | ✅ |
| 5G | Animação otimista de "curtir" posts | ✅ |
| 5H | Pesquisa de estudos bíblicos na comunidade | ✅ |
| 5I | Compartilhar versículo bíblico na comunidade | ✅ |

---

## 🔷 FASE 6 — Bíblia Interlinear Completa ✅ IMPLEMENTADA

### 6.1 — Leitor Interlinear Core

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 6A | Carregamento de 84 traduções (PT, EN, Hebraico, Grego, Aramaico, Latim, Transliteração) | ✅ |
| 6B | Exibição em camadas: Original · Transliteração · Português · Inglês | ✅ |
| 6C | Seletores independentes por camada (por testamento/deuterocanônico) | ✅ |
| 6D | Navegação por livro + capítulo com selects | ✅ |
| 6E | Navegação Anterior / Próximo com wrap automático entre livros | ✅ |
| 6F | Versículo do Dia (aleatório por data, muda à meia-noite) | ✅ |
| 6G | Pesquisa de versículos em tempo real (todos os 66+ livros) | ✅ |
| 6H | Modo Offline: download seletivo por grupo de traduções | ✅ |
| 6I | Remoção de números Strong's do KJV e outras marcações | ✅ |
| 6J | Destaque de versículo ao navegar da pesquisa | ✅ |

### 6.2 — Features Avançadas do Leitor

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 6K | Marcadores (🔖) por versículo com drawer deslizante | ✅ |
| 6L | Destaques por cor (🎨 ouro/verde/azul/vermelho) por versículo | ✅ |
| 6M | Copiar versículo (📋) com fallback para navegadores antigos | ✅ |
| 6N | Compartilhar versículo na Comunidade (📤) direto do leitor | ✅ |
| 6O | Controle de tamanho de fonte (A− / A+) com persistência | ✅ |
| 6P | Painel "Ir para" com input de referência (ex: João 3:16) | ✅ |
| 6Q | Histórico de leitura (chips dos últimos capítulos lidos) | ✅ |
| 6R | Modo Foco (📖): oculta tudo exceto versículos | ✅ |
| 6S | Modo Sépia (🌙): paleta âmbar/marrom para leitura noturna | ✅ |
| 6T | Leitura em Voz Alta (🔊) TTS em pt-BR via Web Speech API | ✅ |
| 6U | Índice de livros (📑): AT + NT + Deuterocanônicos por painel | ✅ |
| 6V | Barra de progresso dourada mostrando Cap. X de Y (X%) | ✅ |
| 6W | Toast de feedback para todas as ações (marcador, cópia, etc.) | ✅ |
| 6X | Favoritos com contador e painel de listagem | ✅ |

---

## 📐 Arquitetura Atual
```
bussula-jerusalem/
├── www/                          ← Código web (todas as plataformas)
│   ├── index.html                ← SPA com 7 abas
│   ├── manifest.json             ← PWA manifest
│   ├── sw.js                     ← Service Worker v12 (cache offline)
│   ├── css/
│   │   └── style.css             ← Tema hebraico sacro + sépia + features
│   ├── js/
│   │   ├── app.js                ← Orquestrador + 32 salmos + configurações
│   │   ├── compass.js            ← Bússola 3D + vibração + calibração
│   │   ├── geolocation.js        ← GPS + cálculos bearing/distância
│   │   ├── maps.js               ← Google Static Maps API
│   │   ├── pix.js                ← Doação PIX + QR Code
│   │   ├── music.js              ← Web Audio API (melodias hebraicas)
│   │   ├── community.js          ← Comunidade + Google Sign-In + Email auth
│   │   ├── bible.js              ← Leitor Interlinear (84 traduções)
│   │   │                            Marcadores · Destaques · Histórico · TTS
│   │   │                            Sépia · Foco · Progresso · Jump Panel
│   │   ├── bible-features.js     ← Favoritos · Índice · Dark Mode herdado
│   │   └── bible-ui-injector.js  ← Injeção de painéis (Favoritos/Índice)
│   └── data/
│       └── bibles/               ← 84 traduções em JSON (66+ livros cada)
│           ├── books_pt.json     ← Nomes PT-BR dos livros
│           ├── books_en.json     ← Nomes EN dos livros
│           ├── ACF11/ … WEB/     ← Pastas por tradução (1 JSON por livro)
│           └── …
│
├── backend/                      ← API Flask
│   ├── app.py                    ← Rotas REST + Google OAuth + rate limiting
│   ├── auth.py                   ← Auth email (SMTP tokens)
│   ├── database.py               ← SQLite schema
│   ├── psalms.py                 ← Salmos para tokens de auth
│   ├── requirements.txt          ← Dependências Python
│   ├── Procfile                  ← Deploy (gunicorn)
│   └── .env.example              ← Template de variáveis
│
├── electron/                     ← Desktop wrapper
│   ├── main.js                   ← Processo principal
│   └── preload.js                ← Bridge seguro
│
├── android/                      ← Capacitor Android (gerado)
├── capacitor.config.json
├── package.json
├── render.yaml                   ← Deploy backend (Render.com)
├── vercel.json                   ← Deploy PWA (Vercel)
├── netlify.toml                  ← Deploy PWA (Netlify)
├── BUILD_GUIDE.md
└── ROADMAP.md                    ← Este arquivo
```

---

## 🚀 Próximos Passos para Go-Live

### Para publicar o APK (Play Store):
1. Gerar APK assinado no Android Studio
2. Criar conta de desenvolvedor Google Play ($25 única)
3. Upload do AAB/APK na Play Console

### Para publicar a PWA:
1. Deploy do frontend (Vercel/Netlify) → `vercel --prod` ou git push
2. Deploy do backend (Render.com) → conectar repositório
3. Configurar variáveis de ambiente no Render

### Para Google Sign-In funcionar:
1. Acesse https://console.cloud.google.com/apis/credentials
2. Crie um projeto → OAuth 2.0 Client ID → tipo "Aplicativo Web"
3. Adicione URIs autorizadas (localhost + domínio de produção)
4. Copie o Client ID → variável `GOOGLE_CLIENT_ID` no backend

### Para o Desktop (Electron):
1. `npm install`
2. `npm run electron` → testa localmente
3. `npm run electron:build` → gera .exe para Windows

---

## 🛡️ Tecnologias Utilizadas
- **Frontend:** HTML5, CSS3, JavaScript ES6+ (vanilla IIFE modules)
- **Bíblia:** 84 traduções em JSON · Web Speech API (TTS) · localStorage
- **Mobile:** Capacitor 6 (Android APK)
- **Desktop:** Electron 33+ com electron-builder
- **Backend:** Flask, SQLite, gunicorn, bcrypt, Flask-Limiter
- **Auth:** Google OAuth 2.0 + Email SMTP (tokens 6 dígitos)
- **Maps:** Google Static Maps API
- **PWA:** Service Worker v12, Web App Manifest, Cache API
- **Doação:** PIX via QRCode.js


---

## 🔷 FASE 1 — Aplicativo Android (APK) ✅ CONCLUÍDA
**Tecnologia:** HTML5 + CSS3 + JavaScript → Empacotado com Capacitor (APK nativo)

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 1A | Estrutura base do projeto web | ✅ |
| 1B | Tema Hebraico Antigo / Sacro (CSS) | ✅ |
| 1C | Bússola 3D com seta + DeviceOrientation API | ✅ |
| 1D | Integração GPS + Google Static Maps API | ✅ |
| 1E | Cálculo de direção e distância até Jerusalém | ✅ |
| 1F | Sistema de doação via PIX (QR Code real) | ✅ |
| 1G | Player de música hebraica (Web Audio API) | ✅ |
| 1H | Comunidade com Google Sign-In + email auth | ✅ |
| 1I | Ícones PNG gerados (todos os tamanhos) | ✅ |
| 1J | Empacotamento APK com Capacitor | ✅ |
| 1K | Vibração ao alinhar com Jerusalém (±5°) | ✅ |
| 1L | Indicador de calibração da bússola | ✅ |
| 1M | Tema claro/escuro (pergaminho/noturno) | ✅ |
| 1N | Splash animado (Estrela de Davi CSS) | ✅ |
| 1O | 32 salmos/versículos embutidos offline | ✅ |
| 1P | Testes e publicação na Play Store | ⬜ |

---

## 🔷 FASE 2 — Site Web (PWA) ✅ IMPLEMENTADA
**Tecnologia:** Mesmo código da Fase 1 como Progressive Web App

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 2A | Service Worker com cache inteligente | ✅ |
| 2B | Manifest PWA completo | ✅ |
| 2C | Estratégia cache-first (assets) + network-first (API) | ✅ |
| 2D | Config de deploy: Vercel + Netlify | ✅ |
| 2E | Deploy efetivo em hospedagem | ⬜ |
| 2F | Domínio personalizado | ⬜ |

---

## 🔷 FASE 3 — Aplicativo Desktop (Electron) ✅ IMPLEMENTADA
**Tecnologia:** Electron (Windows/Mac/Linux)

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 3A | Configurar projeto Electron (main.js + preload.js) | ✅ |
| 3B | UI adaptada para desktop (janela vertical 420×800) | ✅ |
| 3C | electron-builder configurado (.exe, .dmg, AppImage) | ✅ |
| 3D | Menu nativo com atalhos | ✅ |
| 3E | Gerar instaladores e publicar | ⬜ |

---

## 🔷 FASE 4 — Backend & Autenticação ✅ IMPLEMENTADA
**Tecnologia:** Flask + SQLite + Google OAuth + SMTP

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 4A | API REST completa (posts, comentários, likes, notificações) | ✅ |
| 4B | Autenticação por email (token 6 dígitos via SMTP) | ✅ |
| 4C | Google Sign-In (OAuth 2.0 / Identity Services) | ✅ |
| 4D | Perfis com avatar emoji + bio | ✅ |
| 4E | Config de deploy Render.com (render.yaml + Procfile) | ✅ |
| 4F | Deploy efetivo do backend | ⬜ |

---

## 📐 Arquitetura Final
```
bussula-jerusalem/
├── www/                        ← Código web (compartilhado por todas as plataformas)
│   ├── index.html              ← Página principal (5 abas)
│   ├── manifest.json           ← PWA manifest
│   ├── sw.js                   ← Service Worker (cache offline)
│   ├── css/
│   │   └── style.css           ← Tema hebraico sacro + light/dark
│   ├── js/
│   │   ├── app.js              ← Orquestrador + 32 salmos + configurações
│   │   ├── compass.js          ← Bússola 3D + vibração + calibração
│   │   ├── geolocation.js      ← GPS + cálculos de bearing/distância
│   │   ├── maps.js             ← Google Static Maps API (lazy-load)
│   │   ├── pix.js              ← Sistema de doação + QR Code
│   │   ├── music.js            ← Web Audio API (melodias hebraicas)
│   │   └── community.js        ← Comunidade + Google Sign-In + Email auth
│   └── assets/
│       └── img/                ← Ícones PNG (72-512px)
│
├── backend/                    ← API Flask
│   ├── app.py                  ← Rotas REST + Google OAuth
│   ├── auth.py                 ← Auth email (SMTP tokens)
│   ├── database.py             ← SQLite schema
│   ├── psalms.py               ← Salmos para tokens
│   ├── requirements.txt        ← Dependências Python
│   ├── Procfile                ← Deploy (gunicorn)
│   └── .env.example            ← Template de variáveis
│
├── electron/                   ← Desktop wrapper
│   ├── main.js                 ← Processo principal
│   └── preload.js              ← Bridge seguro
│
├── android/                    ← Capacitor Android (gerado)
├── capacitor.config.json       ← Config do Capacitor
├── package.json                ← Scripts + electron-builder
├── render.yaml                 ← Deploy backend (Render.com)
├── vercel.json                 ← Deploy PWA (Vercel)
├── netlify.toml                ← Deploy PWA (Netlify)
├── BUILD_GUIDE.md              ← Guia de build
└── ROADMAP.md                  ← Este arquivo
```

---

## 🚀 Próximos Passos para Go-Live

### Para publicar o APK (Play Store):
1. Gerar APK assinado no Android Studio
2. Criar conta de desenvolvedor Google Play ($25 única)
3. Upload do AAB/APK na Play Console

### Para publicar a PWA:
1. Deploy do frontend (Vercel/Netlify) → `vercel --prod` ou git push
2. Deploy do backend (Render.com) → conectar repositório
3. Configurar variáveis de ambiente no Render

### Para Google Sign-In funcionar:
1. Acesse https://console.cloud.google.com/apis/credentials
2. Crie um projeto → OAuth 2.0 Client ID → tipo "Aplicativo Web"
3. Adicione URIs autorizadas (localhost + domínio de produção)
4. Copie o Client ID e adicione como variável `GOOGLE_CLIENT_ID` no backend

### Para o Desktop (Electron):
1. `npm install` (instala electron + electron-builder)
2. `npm run electron` → testa localmente
3. `npm run electron:build` → gera .exe para Windows

---

## 🛡️ Tecnologias Utilizadas
- **Frontend:** HTML5, CSS3, JavaScript (vanilla), Web Audio API
- **Mobile:** Capacitor 6 (Android APK)
- **Desktop:** Electron 33+ com electron-builder
- **Backend:** Flask, SQLite, gunicorn
- **Auth:** Google OAuth 2.0 + Email SMTP (tokens)
- **Maps:** Google Static Maps API
- **PWA:** Service Worker, Web App Manifest
- **Doação:** PIX via QRCode.js
