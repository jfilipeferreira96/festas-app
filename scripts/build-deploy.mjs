#!/usr/bin/env node
/**
 * build-deploy.mjs
 * -----------------------------------------------------------------------------
 * Compila e empaqueta a app Next.js (modo "standalone") para deploy no cPanel
 * (Node.js v22 + Phusion Passenger), pronta a enviar por FTP.
 *
 * O QUE FAZ
 *   1. (com --build) regenera o cliente Prisma (engines Windows + Linux) e corre
 *      `npm run build` para gerar o bundle standalone self-contained.
 *   2. monta a pasta ./deploy/ com:
 *        - o servidor standalone (server.js + .next + node_modules já resolvidos)
 *        - .next/static (assets do cliente) + public/
 *        - uploads/ (pasta persistente, vazia)
 *        - app.js  -> entry point do Phusion Passenger
 *        - .env    -> variáveis de PRODUÇÃO
 *        - README-DEPLOY.md -> instruções cPanel
 *   3. valida que a engine Prisma para Linux está presente no bundle.
 *   4. cria deploy.tar.gz com `tar` (formato Unix nativo — extração fiável no
 *      cPanel) E deploy.zip com `archiver` (alternativa, forward-slash).
 *
 * VANTAGEM: o servidor cPanel NÃO precisa de correr `npm install` nem `npm run
 * build` — o node_modules já vem dentro do bundle (apenas o estritamente
 * necessário, traçado pelo Next.js). É só extrair e arrancar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️  O node_modules TEM DE IR no bundle (não pode ser removido!)
 * ────────────────────────────────────────────────────────────────────────────
 * O servidor Next.js "standalone" (apps/web/server.js) NÃO é um único ficheiro:
 * ele faz `require('next')`, `require('@prisma/client')`, `require('@festas/db')`,
 * etc. em runtime. Esses pacotes TÊM de existir na pasta node_modules/ do bundle,
 * senão a app arranca com "Cannot find module".
 *
 * MAS — o node_modules que vai no bundle é o **traçado** (só o que a app
 * realmente usa em produção), não o node_modules completo de desenvolvimento:
 *   • node_modules de dev: ~1-2 GB (com TypeScript, vitest, ferramentas...)
 *   • node_modules traçado (no bundle): ~110-130 MB  → zip: ~45 MB
 *
 * Existem DOIS modelos de deploy para cPanel:
 *
 *   (A) STANDALONE + node_modules incluído  ← ESTE SCRIPT (recomendado)
 *       • Envia-se o deploy.zip com node_modules dentro.
 *       • No servidor: extrair e arrancar. SEM npm install.
 *       • Pró: evita correr comandos pesados no cPanel (que pode limitar RAM/tempo).
 *
 *   (B) CÓDIGO-FONTE + npm install no servidor  (estilo guia Next.js/cPanel)
 *       • Envia-se só o código + .next (zip pequeno, ~5 MB) SEM node_modules.
 *       • No servidor: correr `npm install` (na UI do cPanel ou via SSH).
 *       • Contra: o `npm install` pode falhar por limites de RAM/tempo no shared
 *         hosting; precisa que o servidor resolva os workspaces do monorepo.
 *
 * Optámos pelo modelo (A) porque tu preferes não depender de comandos pesados
 * no servidor. O zip de ~45 MB envia-se bem por FTP/File Manager.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * USO
 *   node scripts/build-deploy.mjs            # monta bundle + zip (build já feito)
 *   node scripts/build-deploy.mjs --build    # regenera Prisma + build antes de montar
 *   node scripts/build-deploy.mjs --no-zip   # só monta a pasta deploy/
 * -----------------------------------------------------------------------------
 */

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync, createWriteStream } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- config -----------------------------------------------------------------
const args = new Set(process.argv.slice(2));
const DO_BUILD = args.has("--build");
const DO_ZIP = !args.has("--no-zip");

const STANDALONE = join(ROOT, "apps", "web", ".next", "standalone");
const STATIC_DIR = join(ROOT, "apps", "web", ".next", "static");
const PUBLIC_DIR = join(ROOT, "apps", "web", "public");
const ENV_PROD = join(ROOT, "apps", "web", ".env.production");
const DEPLOY = join(ROOT, "deploy");
const DEPLOY_ZIP = join(ROOT, "deploy.zip");
const DEPLOY_TARGZ = join(ROOT, "deploy.tar.gz");

// --- helpers ----------------------------------------------------------------
const log = (...a) => console.log("›", ...a);
const ok = (...a) => console.log("✓", ...a);
const err = (...a) => {
  console.error("✗", ...a);
  process.exit(1);
};

function run(cmd) {
  log("run:", cmd);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else total += statSync(p).size;
  }
  return total;
}

function human(bytes) {
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < u.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${u[i]}`;
}

// ---------------------------------------------------------------------------
console.log("\n🚀  build-deploy.mjs — empacotamento para cPanel\n");

// 1. BUILD (opcional) -------------------------------------------------------
if (DO_BUILD) {
  log("A regenerar o cliente Prisma (engines Windows + Linux)...");
  run("npm run db:generate");
  log("A compilar a app (packages + Next.js standalone)...");
  run("npm run build");
}

if (!existsSync(STANDALONE)) {
  err("O bundle standalone não existe em apps/web/.next/standalone.", "Corre primeiro: node scripts/build-deploy.mjs --build");
}
ok("Bundle standalone encontrado.");

// 2. LIMPAR E MONTAR ./deploy/ ----------------------------------------------
log("A limpar ./deploy/ anterior...");
rmSync(DEPLOY, { recursive: true, force: true });
rmSync(DEPLOY_ZIP, { force: true });
rmSync(DEPLOY_TARGZ, { force: true });
mkdirSync(DEPLOY, { recursive: true });

// 2a. servidor standalone (server.js + .next + node_modules + packages)
log("A copiar standalone -> deploy/ (pode demorar ~1 min)...");
cpSync(STANDALONE, DEPLOY, { recursive: true });
ok("standalone copiado.");

// 2a1. CloudLinux — renomear node_modules para node_modules_deps -----------
// O CloudLinux Node.js Selector NÃO permite uma pasta "node_modules" real na
// raiz da aplicação (exige um symlink para virtualenv). Renomeamos para
// "node_modules_deps" e configuramos NODE_PATH no app.js para resolução de
// módulos. Isto evita o erro: "application should not contain folder/file with
// such name [node_modules] in application root".
log("A renomear node_modules -> node_modules_deps (compatibilidade CloudLinux)...");
{
  const nmDir = join(DEPLOY, "node_modules");
  const nmDepsDir = join(DEPLOY, "node_modules_deps");
  rmSync(nmDepsDir, { recursive: true, force: true });
  try {
    renameSync(nmDir, nmDepsDir);
  } catch {
    // Windows: renameSync pode falhar com EPERM (ficheiros ainda locked).
    // Fallback: copiar + apagar original.
    log("renameSync falhou (EPERM?), a usar cpSync como fallback...");
    cpSync(nmDir, nmDepsDir, { recursive: true });
    rmSync(nmDir, { recursive: true, force: true });
  }
}
ok("node_modules renomeado para node_modules_deps.");

// 2a2. Substituir package.json raiz por um minimalista --------------------
// O package.json que vem do standalone é o do monorepo (com "workspaces").
// No cPanel/CloudLinux, isso faria o `npm install` tentar resolver workspaces
// e falhar. Substituímos por um package.json minimalista sem workspaces nem
// dependências (tudo já está em node_modules_deps).
log("A substituir package.json raiz (minimalista, sem workspaces)...");
writeFileSync(
  join(DEPLOY, "package.json"),
  JSON.stringify(
    {
      name: "festas-standalone",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: { start: "node app.js" },
    },
    null,
    2,
  ) + "\n",
);
ok("package.json minimalista criado.");

// 2b. .next/static (assets do cliente — NÃO vêm no standalone)
const webNext = join(DEPLOY, "apps", "web", ".next");
mkdirSync(webNext, { recursive: true });
if (existsSync(STATIC_DIR)) {
  log("A copiar .next/static -> deploy/apps/web/.next/static...");
  cpSync(STATIC_DIR, join(webNext, "static"), { recursive: true });
  ok(".next/static copiado.");
} else {
  err("apps/web/.next/static não existe. Corre `npm run build` primeiro.");
}

// 2c. public/ (favicon, imagens, etc.)
const webPublic = join(DEPLOY, "apps", "web", "public");
if (existsSync(PUBLIC_DIR)) {
  log("A copiar public/ -> deploy/apps/web/public...");
  cpSync(PUBLIC_DIR, webPublic, { recursive: true });
  ok("public/ copiado.");
}

// 2d. uploads/ (fotos de perfil — pasta persistente gravável)
const uploads = join(webPublic, "uploads", "profile-photos");
mkdirSync(uploads, { recursive: true });
writeFileSync(join(webPublic, "uploads", ".gitkeep"), "");
ok("uploads/ criado (gravável).");

// 2e. .env de PRODUÇÃO (sobrescreve o .env local que veio traçado)
const envDest = join(DEPLOY, "apps", "web", ".env");
if (existsSync(ENV_PROD)) {
  writeFileSync(envDest, readFileSync(ENV_PROD, "utf8"));
  ok(".env de produção copiado para deploy/apps/web/.env");
} else {
  err("apps/web/.env.production não existe. Cria-o com as credenciais de produção.");
}

// 2f. app.js — entry point do Phusion Passenger -----------------------------
//    (root package.json é "type":"module", por isso app.js é ESM).
//    Carrega .env manualmente (sem depender do package dotenv no root) para
//    garantir que DATABASE_URL está disponível antes de qualquer import.
const APP_JS = `// app.js — entry point do Phusion Passenger (cPanel Node.js App)
// Auto-gerado por scripts/build-deploy.mjs — NÃO EDITAR À MÃO (regenerar no próximo deploy).
//
// Em cPanel: "Application startup file" = app.js
//
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Module from "node:module";

// --- carregar .env de produção manualmente (robusto, sem dependências) -----
const here = dirname(fileURLToPath(import.meta.url));

// --- NODE_PATH: resolver módulos de node_modules_deps (compat. CloudLinux) ---
// O CloudLinux Node.js Selector exige que "node_modules" seja um symlink para
// um virtualenv, não uma pasta real na raiz da app. As dependências foram
// renomeadas para "node_modules_deps" e NODE_PATH garante a resolução.
process.env.NODE_PATH = join(here, "node_modules_deps");
Module._initPaths();

const envPath = join(here, "apps", "web", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\\n")) {
    const m = line.match(/^\\s*([\\w.-]+)\\s*=\\s*(.*)\\s*$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue; // não sobrescrever vars já definidas
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

// --- ambiente do Passenger -------------------------------------------------
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || 3000;

// --- arrancar o servidor Next.js standalone (self-contained) ---------------
await import("./apps/web/server.js");
`;
writeFileSync(join(DEPLOY, "app.js"), APP_JS);
ok("app.js (entry Passenger) criado.");

// 2f2. app2.js — TESTE de configuração (servir HTML estático) ---------------
// Ficheiro de teste que serve uma página HTML simples (sem node_modules).
// O utilizador pode mudar o "Application startup file" para app2.js no cPanel
// para verificar que a configuração Node.js + Passenger está correcta.
cpSync(join(__dirname, "app2.js"), join(DEPLOY, "app2.js"));
ok("app2.js (teste de configuração) copiado.");

// 2g. README-DEPLOY.md — instruções de deploy no cPanel ---------------------
const README = `# 🚀 Deploy no cPanel — Festas (Next.js standalone)

Este bundle é **self-contained**: já inclui o \`node_modules\` necessário e o build
\`.next\`. **NÃO é preciso correr \`npm install\` nem \`npm run build\` no servidor.**

## Estrutura do bundle

\`\`\`
deploy/
├── app.js                 ← ENTRY POINT do Phusion Passenger (startup file)
├── package.json           ← raiz (type: module)
├── apps/web/
│   ├── server.js          ← servidor Next.js standalone (auto-contido)
│   ├── .env               ← variáveis de PRODUÇÃO (editar se necessário)
│   ├── .next/static/      ← assets do cliente (JS/CSS)
│   ├── public/uploads/    ← fotos de perfil (gravável)
│   └── src/               ← código traçado pelo Next.js
├── node_modules/          ← dependências (apenas o necessário)
└── packages/              ← @festas/db, @festas/auth, @saas/* (já compilados)
\`\`\`

## Passos no cPanel

### 1. Criar a aplicação Node.js
- **Software → Setup Node.js App → Create Application**
- **Node.js version:** \`22\`
- **Application mode:** \`Production\`
- **Application root:** \`festas\` (pasta onde vais extrair)
- **Application URL:** o teu domínio/subdomínio (ex.: \`baselandia.pt\`)
- **Application startup file:** \`app.js\`
- Clicar **Create Application**

### 2. Enviar os ficheiros

**⚠️ LIMPAR a pasta antes de extrair!** Apaga TODOS os ficheiros e pastas
existentes na Application root (incluindo extrações anteriores falhadas).
Deixar ficheiros antigos causa erros "Permission denied" na extração.

**Recomendado: deploy.tar.gz** (formato Unix nativo):
- Faz upload do \`deploy.tar.gz\` para a pasta da aplicação.
- No File Manager: botão direito → **Extract**.
- O tar.gz é extraído SEM erros de permissão (formato nativo Linux/cPanel).

**Alternativa: FTP**:
- Extrai localmente e envia o conteúdo de \`deploy/\` por FTP (FileZilla).

### 3. Variáveis de ambiente
O \`app.js\` carrega \`apps/web/.env\` automaticamente. Confirma/edita:
\`\`\`
DATABASE_URL=mysql://utilizador:password@localhost:3306/baselandia_prod
NEXT_PUBLIC_APP_URL=https://baselandia.pt
BETTER_AUTH_SECRET=<gerar com: openssl rand -base64 32>
BETTER_AUTH_URL=https://baselandia.pt
\`\`\`
> Em produção, o MySQL é acedido via \`localhost\` (mesma máquina), NÃO pelo IP remoto.
> Em alternativa, podes definir as variáveis na UI do cPanel (Environment variables).

### 4. Inicializar a base de dados MySQL (1ª vez)
Se ainda não o fizeste, cria as tabelas no MySQL de produção. Podes:
- Fazer \`db:push\` localmente apontando para a BD de produção, OU
- Importar o schema via cPanel (phpMyAdmin).

### 5. Arrancar / reiniciar
- Na UI do cPanel Node.js App, clicar **Restart** (ou **Start**).
- Abrir o **Application URL** — a app deve arrancar.

## Resolução de problemas

| Sintoma | Causa / Solução |
|---|---|
| Erro 502 / app não arranca | Confirma **Application startup file = app.js** e que está na **raiz** da app |
| \`Prisma Client initialization error: query engine\` | A engine Linux não está no bundle. Regenera: \`node scripts/build-deploy.mjs --build\` |
| \`Can't reach database server\` | Em produção usa \`localhost\` no \`DATABASE_URL\`, não o IP remoto |
| \`Environment variable not found: DATABASE_URL\` | Confirma que \`apps/web/.env\` existe e tem a variável, OU define-a na UI do cPanel |
| Estáticos 404 (sem CSS/JS) | Falta copiar \`.next/static\` para \`apps/web/.next/static\` |
| Fotos de perfil não gravam | Permissões da pasta \`apps/web/public/uploads/profile-photos\` (chmod 775) |

## Regenerar o bundle
\`\`\`powershell
# Na raiz do projeto, em Windows:
node scripts/build-deploy.mjs --build   # regenera Prisma + build + bundle + zip
\`\`\`
`;
writeFileSync(join(DEPLOY, "README-DEPLOY.md"), README);
ok("README-DEPLOY.md criado.");

// 3. VALIDAR ENGINE PRISMA LINUX --------------------------------------------
const prismaClientDir = join(DEPLOY, "node_modules_deps", ".prisma", "client");
let linuxEngine = false;
if (existsSync(prismaClientDir)) {
  const engines = readdirSync(prismaClientDir).filter((f) => /libquery_engine-(debian|rhel|linux)/.test(f));
  linuxEngine = engines.length > 0;
  if (linuxEngine) ok(`Engine Prisma Linux presente: ${engines.join(", ")}`);
}
if (!linuxEngine) {
  console.warn(
    "⚠️  AVISO: não encontrei a engine Prisma para Linux no bundle.\n" + "   Corre:  node scripts/build-deploy.mjs --build\n" + "   (garante que packages/db/prisma/schema.prisma tem binaryTargets com alvo Linux)",
  );
}

// 4. TAMANHO DO BUNDLE -------------------------------------------------------
const size = dirSize(DEPLOY);
ok(`Tamanho do bundle (descomprimido): ${human(size)}`);

// 5. EMPACOTAR (TAR.GZ + ZIP) ------------------------------------------------
if (DO_ZIP) {
  // ────────────────────────────────────────────────────────────────────────
  // 5a. deploy.tar.gz — FORMATO UNIX NATIVO (recomendado para cPanel)
  // ────────────────────────────────────────────────────────────────────────
  // O cPanel extrai tar.gz de forma MUITO mais fiável do que zip:
  //   • tar armazena permissões Unix nativas (755 dirs / 644 files)
  //   • separadores forward-slash por definição
  //   • o extractor nativo do cPanel (baseado em GNU tar) é robusto
  // Isto resolve o erro "checkdir error: cannot create... Permission denied"
  // que ocorre ao extrair zips grandes no File Manager do cPanel.
  log("A criar deploy.tar.gz (formato Unix nativo — recomendado para cPanel)...");
  const { create: tarCreate } = await import("tar");
  if (existsSync(DEPLOY_TARGZ)) rmSync(DEPLOY_TARGZ);

  await tarCreate(
    {
      gzip: true,
      file: DEPLOY_TARGZ,
      cwd: DEPLOY,
      dmode: 0o755, // permissões de diretórios (rwxr-xr-x)
      fmode: 0o644, // permissões de ficheiros (rw-r--r--)
      portable: true, // normaliza uid/gid/mtime (compatível cross-platform)
    },
    readdirSync(DEPLOY), // entradas directas de deploy/ (sem prefixo ".")
  );

  if (existsSync(DEPLOY_TARGZ)) {
    ok(`deploy.tar.gz final: ${human(statSync(DEPLOY_TARGZ).size)}`);
  }

  // ────────────────────────────────────────────────────────────────────────
  // 5b. deploy.zip — ALTERNATIVA (com archiver, forward-slash)
  // ────────────────────────────────────────────────────────────────────────
  // Mantido como fallback para hosts que só aceitam zip.
  log("A criar deploy.zip com archiver (alternativa, forward-slash)...");
  const { default: archiver } = await import("archiver");
  if (existsSync(DEPLOY_ZIP)) rmSync(DEPLOY_ZIP);

  const output = createWriteStream(DEPLOY_ZIP);
  const archive = archiver("zip", { zlib: { level: 7 } });

  archive.on("warning", (e) => {
    if (e.code !== "ENOENT") err("zip warning:", e);
  });
  archive.on("error", (e) => err("Erro ao criar zip:", e));

  archive.pipe(output);
  // false = conteúdo de deploy/ vai para a RAIZ do zip (sem pasta "deploy/" encapsulante)
  archive.directory(DEPLOY, false);
  await archive.finalize();

  // aguarda o fecho do stream de escrita
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
  });

  if (existsSync(DEPLOY_ZIP)) {
    ok(`deploy.zip final: ${human(statSync(DEPLOY_ZIP).size)}`);
  }
}

// 6. RESUMO ------------------------------------------------------------------
console.log("\n──────────────────────────────────────────────────────────");
console.log("📦 DEPLOY PRONTO\n");
console.log(`   Pasta: ${relative(ROOT, DEPLOY)}/`);
if (existsSync(DEPLOY_TARGZ)) console.log(`   TAR.GZ: ${relative(ROOT, DEPLOY_TARGZ)}  ← RECOMENDADO para cPanel`);
if (existsSync(DEPLOY_ZIP)) console.log(`   ZIP:    ${relative(ROOT, DEPLOY_ZIP)}`);
console.log("\n   Próximos passos (cPanel) — ver deploy/README-DEPLOY.md");
console.log("──────────────────────────────────────────────────────────\n");
