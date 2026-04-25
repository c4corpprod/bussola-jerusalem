# 📱 GUIA DE BUILD — Gerar APK Android

> **© Marcos Fernando — C4 Corporation**
> Bússola para Jerusalém

---

## 📋 Pré-requisitos

1. **Node.js** (v18+) → https://nodejs.org
2. **Android Studio** → https://developer.android.com/studio
3. **Java JDK 17** → Instalado com o Android Studio

---

## ⛔ Google Maps API Key

A chave do Google Maps já está configurada no projeto:
- **index.html** — Script do Google Maps JS API
- **AndroidManifest.xml** — meta-data `com.google.android.geo.API_KEY`

Se precisar trocar a chave, altere nos dois arquivos acima.

---

## ⚙️ PASSO 1 — Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
cd "Bussula para Jerusalem"
npm install
```

---

## 📱 PASSO 2 — Plataforma Android (já configurada)

A plataforma Android já foi adicionada. Caso precise recriar:

```bash
npx cap add android
```

---

## 🔄 PASSO 3 — Sincronizar Código Web → Android

Sempre que alterar arquivos em `www/`, sincronize:

```bash
npx cap sync android
```

---

## 🛠️ PASSO 4 — Abrir no Android Studio

```bash
npx cap open android
```

Ou abra manualmente a pasta `android/` no Android Studio.

---

## 📝 PASSO 5 — Permissões Android (já configuradas)

As permissões já estão configuradas no `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS" />
```

---

## 🔨 PASSO 6 — Gerar APK

No Android Studio:

1. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Aguarde o build
3. O APK será gerado em:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Para APK de Release (Play Store):

1. Menu: **Build → Generate Signed Bundle / APK**
2. Crie ou selecione seu Keystore
3. Preencha as informações de assinatura
4. Selecione **APK** ou **Android App Bundle (.aab)**
5. Selecione **release**
6. Build!

---

## 🏾 PASSO 7 — Publicar na Play Store

1. Acesse: https://play.google.com/console
2. Crie uma conta de desenvolvedor (taxa única de $25 USD)
3. Crie um novo aplicativo
4. Preencha:
   - Nome: **Bússola para Jerusalém**
   - Descrição: Bússola sagrada que aponta para Jerusalém
   - Categoria: **Viagens e local** ou **Estilo de vida**
   - Classificação: **Livre**
5. Faça upload do `.aab` (App Bundle)
6. Envie para revisão

---

## 🧪 Testar no Navegador (Desenvolvimento)

Para testar rapidamente sem compilar APK:

```bash
npm start
```

Acesse `http://localhost:8080` no navegador.

> **Nota:** A bússola precisa de HTTPS para funcionar no navegador (exceto localhost).
> O GPS funciona em localhost. Para testar em celular, use HTTPS.

---

## 📁 Estrutura Final do Projeto

```
Bussula para Jerusalem/
├── www/                    ← Código web
│   ├── index.html
│   ├── manifest.json
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── compass.js
│   │   ├── geolocation.js
│   │   ├── maps.js
│   │   └── pix.js
│   └── assets/img/
├── android/                ← Gerado pelo Capacitor
├── capacitor.config.json
├── package.json
├── ROADMAP.md
└── BUILD_GUIDE.md
```

---

## ⚠️ Notas Importantes

- A **chave do Google Maps** já está configurada (HTML + AndroidManifest)
- A bússola e mapa precisam de **internet**, o resto funciona offline
- O GPS funciona melhor **ao ar livre**
- Para a bússola funcionar, o dispositivo precisa de **magnetômetro**
- Teste sempre em **dispositivo real** (emulador não tem bússola)
