# 🚀 Guia de Deploy no cPanel — Festas

> Ficheiro gerado para te guiar passo-a-passo. Tudo o que precisas enviar está em **`deploy/`** (ou **`deploy.zip`**, que é a mesma coisa comprimida).

---

## ✅ Resumo rápido

**Sim — basicamente é colocar a pasta `deploy/` (ou extrair o `deploy.zip`) na pasta da aplicação no cPanel e configurar o "startup file".** O bundle é **self-contained**: já traz o `node_modules` e o build `.next`, por isso **NÃO precisas de correr `npm install` nem `npm run build` no servidor.**

Há só **3 configurações** a fazer no cPanel:
1. Criar a aplicação Node.js (dizer qual é o ficheiro de arranque).
2. Garantir que a base de dados MySQL existe e tem as tabelas.
3. Confirmar as variáveis de ambiente (`.env`).

---

## 📦 O que vai dentro do cPanel

O conteúdo da pasta **`deploy/`** (ou o que aparece ao extrair `deploy.zip`):

```
app.js                  ← FICHEIRO DE ARRANQUE (startup file) do Passenger
package.json
apps/
  └── web/
      ├── server.js          ← servidor Next.js (auto-contido)
      ├── .env               ← variáveis de PRODUÇÃO (editar!)
      ├── .next/static/      ← assets do navegador (JS/CSS)
      └── public/uploads/    ← fotos de perfil (gravável)
node_modules/                ← dependências (traçado, ~120 MB)
packages/                    ← @festas/db, @festas/auth (já compilados)
README-DEPLOY.md
```

> ⚠️ **O `node_modules` TEM de ir.** O servidor Next.js faz `require('next')`, `require('@prisma/client')`, etc. em runtime. Sem ele a app não arranca. É por isso que **não precisas de `npm install` no servidor**.

---

## 🛠️ Passo a passo no cPanel

### Passo 1 — Criar a aplicação Node.js
No cPanel: **Software → Setup Node.js App → Create Application**

| Campo | Valor |
|---|---|
| **Node.js version** | `22` |
| **Application mode** | `Production` |
| **Application root** | `festas` (a pasta onde vais pôr os ficheiros) |
| **Application URL** | o teu domínio/subdomínio (ex.: `baselandia.pt`) |
| **Application startup file** | `app.js` |

→ Clica em **Create Application**.

> Isto cria a pasta `festas` e lá dentro um `app.js` e um `.htaccess` de exemplo. **Vais substituir o conteúdo dessa pasta.**

### Passo 2 — Enviar os ficheiros
Escolhe **UM** destes métodos:

**Opção A — File Manager (mais simples para o zip):**
1. cPanel → **File Manager** → entra na pasta da aplicação (`festas`).
2. Apaga o `app.js` e `.htaccess` de exemplo que o cPanel criou.
3. Faz **Upload** do `deploy.zip`.
4. Botão direito no `deploy.zip` → **Extract**.
5. Move todos os ficheiros extraídos para a raiz da pasta `festas`, de modo a que **`app.js`** fique mesmo na raiz (não dentro de uma subpasta `deploy/`).
6. Apaga o `deploy.zip`.

**Opção B — FTP:**
1. Liga-te por FTP à pasta da aplicação.
2. Envia **todo o conteúdo** de `deploy/` (a pasta local) para dentro da pasta `festas`.
3. Confirma que `app.js` fica na raiz de `festas`.

### Passo 3 — Configurar o `.env` de produção
Abre **`apps/web/.env`** (no File Manager, botão direito → Edit) e confirma/ajusta:

```ini
# URL pública da app
NEXT_PUBLIC_APP_URL=https://baselandia.pt

# MySQL — NO SERVIDOR usa-se "localhost" (mesma máquina), NÃO o IP remoto!
DATABASE_URL=mysql://UTILIZADOR_BD:PASSWORD_BD@localhost:3306/baselandia_prod

# Better Auth
BETTER_AUTH_SECRET=<NOVO SECRET — ver abaixo como gerar>
BETTER_AUTH_URL=https://baselandia.pt
```

> 🔑 **Gerar um `BETTER_AUTH_SECRET` seguro:** no terminal SSH do cPanel (ou localmente), corre:
> ```bash
> openssl rand -base64 32
> ```
> Copia o resultado para `BETTER_AUTH_SECRET`. (O que está agora é só placeholder.)

> ℹ️ Em alternativa às variáveis no `.env`, podes defini-las na UI do cPanel: **Setup Node.js App → edita a app → Environment variables**.

### Passo 4 — Garantir a base de dados MySQL
A app precisa da base de dados **`baselandia_prod`** com as tabelas criadas.

- **Se já fizeste `db:push` para a BD de produção** (a partir do teu PC, apontando para a BD remota) → as tabelas já estão. ✅
- **Se ainda não:** cria a BD + utilizador no cPanel (**MySQL Databases**), depois, no teu PC (local), corre:
  ```powershell
  # aponta para a BD de produção e cria as tabelas:
  $env:DATABASE_URL="mysql://UTILIZADOR_BD:PASSWORD_BD@HOST_REMOTO:3306/baselandia_prod"
  npm run db:push
  ```
  E opcionalmente mete dados iniciais:
  ```powershell
  npm run db:seed:prod
  ```

### Passo 5 — Reiniciar a aplicação
No cPanel: **Setup Node.js App → seleciona a tua app → Restart** (ou Start).

### Passo 6 — Abrir e testar
Abre o **Application URL** (ex.: `https://baselandia.pt`). Deveria aparecer a página de **login**.

Testa:
- Login / registo
- Dashboard
- Reservas, Cacifos, Menus, etc.
- Upload de foto de perfil

## 🗄️ Comandos de BD no servidor (cPanel)

Depois das tabelas criadas (Passo 4), podes gerir a BD **diretamente no cPanel**
(terminal SSH ou "Run NPM Script" da aplicação). O bundle traz um seed mínimo e
utilitários que usam só o `@prisma/client` (sem precisar do CLI Prisma):

| Comando | O que faz |
|---|---|
| `npm run db:seed` | Cria admin + permissões RBAC + config de cacifos (idempotente). Credenciais por defeito: `admin@baselandia.pt` / `Alterar!2025`. |
| `npm run db:verify` | Lista todas as tabelas e a contagem de linhas. |
| `npm run db:truncate` | Apaga TODOS os dados (mantém as tabelas). `--keep-auth` preserva utilizadores. |
| `npm run db:reset` | `truncate` + `seed` (limpa tudo e recria o admin). |

> Os comandos assumem que as tabelas já existem (Passo 4). Para CRIAR tabelas
> usa `db:push` a partir do PC local contra a BD remota.

### Alterar as credenciais do admin
Define `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` como variáveis de ambiente
(no `apps/web/.env` ou na UI do cPanel: Environment variables) antes de correr
`db:seed`. Depois, altera a palavra-passe no primeiro login.

---

## 🧯 Resolução de problemas

| Sintoma | Solução |
|---|---|
| Erro 502 / "It works!" em vez da app | Confirma que **Application startup file = `app.js`** e que está na **raiz** da app (não em subpasta) |
| `Cannot find module 'next'` (ou similar) | Falta o `node_modules/` — volta a enviar TODO o conteúdo de `deploy/`, incluindo o `node_modules` |
| `Prisma Client initialization error: query engine` | A engine Linux não chegou. Regenera o bundle: `npm run deploy` (no teu PC) e reenvia |
| `Can't reach database server` / timeout | No `.env` usa `localhost` no `DATABASE_URL` (não o IP remoto) |
| `Environment variable not found: DATABASE_URL` | O `apps/web/.env` não existe ou não tem a variável. Verifica o caminho |
| Página sem CSS / JS (estilos em falta) | Falta `apps/web/.next/static/`. Reenvia essa pasta |
| Fotos de perfil não gravam | Permissões: `apps/web/public/uploads/profile-photos` precisa de escrita (chmod 775) |
| A app arranca mas dá erro 500 | Vê os logs: **cPanel → Setup Node.js App → "View Last Run Logs"** ou o ficheiro de log mostrado na UI |

---

## 🔁 Atualizar a app (deploy seguinte)

Sempre que mudares código:
```powershell
# no teu PC, na raiz do projeto:
npm run deploy          # rebuild + novo deploy.zip
```
Depois envia o `deploy.zip` novo para o cPanel (Passos 2, 5) e reinicia.

---

## 📝 Valores que tens de saber (preenche antes de deploy)

| O quê | Onde obter |
|---|---|
| `UTILIZADOR_BD` / `PASSWORD_BD` | cPanel → **MySQL Databases** (cria utilizador e dá acesso à BD `baselandia_prod`) |
| Nome da BD | `baselandia_prod` (ou o que criares) |
| `BETTER_AUTH_SECRET` | gera com `openssl rand -base64 32` |
| Domínio | o teu (ex.: `baselandia.pt`) |
