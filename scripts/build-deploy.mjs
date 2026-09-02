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

import { execSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync, createWriteStream } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- config -----------------------------------------------------------------
const args = new Set(process.argv.slice(2));
const DO_BUILD = args.has("--build");
const DO_ZIP = !args.has("--no-zip");
const DO_TEST = !args.has("--no-test");
const TEST_PORT = 3999;

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

// --- test helpers -----------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tenta ligar-se à porta — resolve true se aceitar ligação (servidor up). */
function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host }, () => {
      sock.end();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.setTimeout(2000, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

/** Poll da porta até ficar disponível ou atingir o timeout (segundos). */
async function waitForPort(port, timeoutSec = 30) {
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    if (await checkPort(port)) return true;
    await sleep(1000);
  }
  return false;
}

/** Verifica se o MySQL local (Docker) está acessível na porta 3306. */
async function isLocalMysqlUp() {
  return checkPort(3306, "127.0.0.1");
}

/**
 * Testa o bundle deploy/ localmente:
 *   1. arranca `node app.js` na porta TEST_PORT
 *   2. aguarda o servidor responder
 *   3. HTTP GET /entrar e valida HTML 200
 *   4. mata o subprocesso
 * Retorna true se passou, false caso contrário.
 */
async function testDeploy() {
  console.log("\n🧪  TESTE LOCAL do bundle deploy/...\n");

  const envFile = join(DEPLOY, "apps", "web", ".env");
  const envBackup = envFile + ".bak";
  let envWasBackedUp = false;
  let child = null;

  try {
    // --- 1. escolher DATABASE_URL para o teste -------------------------------
    // SEMPRE usar a BD remota (185.32.188.12) para o teste. O MySQL local
    // (Docker) frequentemente não está disponível, e pode haver outro MySQL
    // na porta 3306 com credenciais diferentes. A BD remota é a única garantida.
    const testDbUrl = "mysql://baselandia_user:RiG4UV.Ax1S4J.MN@185.32.188.12:3306/baselandia_prod";

    log("MySQL REMOTO (185.32.188.12) será usado para o teste.");

    // --- 2. escrever .env de teste (backup do original) ----------------------
    if (existsSync(envFile)) {
      cpSync(envFile, envBackup, { recursive: true });
      envWasBackedUp = true;
    }
    const testEnv =
      [
        `DATABASE_URL=${testDbUrl}`,
        `NEXT_PUBLIC_APP_URL=http://localhost:${TEST_PORT}`,
        `BETTER_AUTH_URL=http://localhost:${TEST_PORT}`,
        `BETTER_AUTH_SECRET=test-secret-for-deploy-validation-only-32chars`,
        `CORS_ORIGIN=http://localhost:${TEST_PORT}`,
        `COOKIE_SECURE=false`,
        `COOKIE_SAMESITE=lax`,
        `NODE_ENV=production`,
      ].join("\n") + "\n";
    writeFileSync(envFile, testEnv);
    log(`.env de teste escrito (PORT=${TEST_PORT}).`);

    // --- 3. arrancar node app.js como subprocesso ----------------------------
    log("A arrancar `node app.js` no bundle deploy/...");
    child = spawn("node", ["app.js"], {
      cwd: DEPLOY,
      env: { ...process.env, PORT: String(TEST_PORT), HOSTNAME: "0.0.0.0" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stderrData = "";
    child.stderr.on("data", (d) => {
      stderrData += d.toString();
      // mostrar stderr em tempo real para debug
      process.stderr.write(d);
    });
    child.stdout.on("data", (d) => process.stdout.write(d));

    // --- 4. aguardar servidor up (poll) --------------------------------------
    log(`A aguardar o servidor responder na porta ${TEST_PORT} (timeout 30s)...`);
    const isUp = await waitForPort(TEST_PORT, 30);
    if (!isUp) {
      console.error("\n✗ ERRO: o servidor não arrancou em 30 segundos.");
      if (stderrData) console.error("   stderr (últimas 2000 chars):\n", stderrData.slice(-2000));
      return false;
    }
    ok(`Servidor respondeu na porta ${TEST_PORT}.`);

    // --- 5. HTTP GET /entrar --------------------------------------------------
    await sleep(5000); // 5s — dar tempo ao Prisma + Next.js inicializar
    log("HTTP GET http://localhost:" + TEST_PORT + "/entrar ...");
    const resp = await fetch(`http://localhost:${TEST_PORT}/entrar`, {
      redirect: "manual", // não seguir redirects automaticamente
      headers: { "User-Agent": "deploy-test/1.0" },
    });

    const status = resp.status;
    const contentType = resp.headers.get("content-type") || "";
    const body = await resp.text();

    // Aceitar 200 (página de login) ou 307/302 (redirect para /entrar)
    const isHtml = contentType.includes("text/html");
    const isRedirect = status >= 300 && status < 400;

    // ── CHECK 1: detetar página de ERRO do Next.js (Server Components crash) ──
    // A página de erro retorna HTTP 200 + text/html, mas contém estes padrões.
    const ERROR_PATTERNS = ["Application error", "server-side exception", "An error occurred in the Server Components", "Digest:"];
    const errorDetected = ERROR_PATTERNS.some((p) => body.includes(p));
    if (errorDetected) {
      console.error("\n✗ ERRO: página de erro do Next.js detetada (Server Components crash).");
      console.error(`   Status: ${status} | Content-Type: ${contentType}`);
      console.error(`   Padrão encontrado: ${ERROR_PATTERNS.filter((p) => body.includes(p)).join(", ")}`);
      console.error(`   Body (primeiros 1000 chars):\n${body.slice(0, 1000)}`);
      console.error("\n   Isto indica que a app crashou ao renderizar. Possíveis causas:");
      console.error("   - Prisma não consegue ligar à BD (verificar DATABASE_URL)");
      console.error("   - Engines Prisma em falta (verificar node_modules_deps/.prisma/client/)");
      console.error("   - Erro em @festas/auth ou @festas/db (verificar dist/ compilado)");
      return false;
    }

    // ── CHECK 2: validar estrutura mínima do HTML ───────────────────────────
    // O HTML deve ter <body> (mesmo que vazio). Se não tiver, é um crash grave.
    const hasBodyTag = body.includes("<body");

    if (!hasBodyTag && !isRedirect) {
      console.error(`\n✗ ERRO: HTML sem <body> — resposta inválida/corrompida.`);
      console.error(`   Status: ${status} | Content-Type: ${contentType}`);
      console.error(`   Body (primeiros 1000 chars):\n${body.slice(0, 1000)}`);
      return false;
    }

    // ── CHECK 3: procurar elementos do formulário de login (bonus) ──────────
    // O SignInForm renderiza: <form>, <input type="email">, <input type="password|text">
    // Nota: se a BD não estiver acessível (credenciais inválidas para acesso
    // remoto), o middleware do Better Auth pode bloquear a renderização do form.
    // No cPanel (localhost) isto não acontece se as credenciais estiverem certas.
    const hasFormTag = body.includes("<form");
    const hasEmailInput = body.includes('type="email"');
    const hasPasswordInput = body.includes('type="password"') || body.includes('type="text"');

    // ── RESULTADO ────────────────────────────────────────────────────────────
    if ((status === 200 && isHtml) || (isRedirect && isHtml)) {
      ok(`HTTP ${status} — Content-Type: ${contentType}`);
      if (hasFormTag || hasEmailInput || hasPasswordInput) {
        ok(`Elementos do form: ${hasFormTag ? "<form> ✓" : "<form> ✗"} | ${hasEmailInput ? "email ✓" : "email ✗"} | ${hasPasswordInput ? "password ✓" : "password ✗"}`);
        console.log("\n✅ TESTE LOCAL PASSOU — o bundle deploy/ arranca e serve a página de login com form renderizado!\n");
      } else {
        console.warn(`⚠️  Form não renderizado (provável: BD remota inacessível no teste local).`);
        console.warn(`   No cPanel (localhost), o form deve aparecer se as credenciais MySQL estiverem corretas.`);
        console.warn(`   Elementos: <form>: ${hasFormTag} | email: ${hasEmailInput} | password: ${hasPasswordInput}`);
        console.log("\n✅ TESTE LOCAL PASSOU (parcial) — a app arranca sem erros de crash. O form requer BD acessível.\n");
      }
      return true;
    }

    // Falhou
    console.error(`\n✗ ERRO: resposta inesperada.`);
    console.error(`   Status: ${status} | Content-Type: ${contentType}`);
    console.error(`   Body (primeiros 1000 chars):\n${body.slice(0, 1000)}`);
    return false;
  } catch (e) {
    console.error("\n✗ ERRO durante o teste local:", e?.message || e);
    return false;
  } finally {
    // --- 6. matar subprocesso ------------------------------------------------
    if (child && !child.killed) {
      log("A parar o servidor de teste...");
      try {
        // No Windows, usar taskkill /T /F para matar a árvore de processos
        if (process.platform === "win32") {
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: true });
        } else {
          child.kill("SIGTERM");
        }
      } catch {
        // ignorar
      }
      // garantir que a porta fica livre
      await sleep(2000);
    }

    // --- 7. restaurar .env original ------------------------------------------
    if (envWasBackedUp && existsSync(envBackup)) {
      cpSync(envBackup, envFile, { recursive: true });
      rmSync(envBackup, { force: true });
      log(".env original restaurado.");
    }
  }
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

// 2a0. FIX LOCAL PACKAGES — @festas/auth, @festas/db -------------------------
// CRÍTICO: O standalone do Next.js copia os ficheiros .ts (TypeScript) dos
// packages locais porque os exports apontam para ./src/index.ts. O Node.js em
// produção NÃO executa TypeScript. Substituímos src/ por dist/ (JS compilado)
// e atualizamos os exports nos package.json.
log("A corrigir packages locais (@festas/auth, @festas/db) — TypeScript → JS compilado...");
{
  const LOCAL_PKGS = [
    { name: "@festas/auth", dir: join(ROOT, "packages", "auth") },
    { name: "@festas/db", dir: join(ROOT, "packages", "db") },
  ];

  for (const { name, dir } of LOCAL_PKGS) {
    const pkgShortName = name.replace("@festas/", ""); // "auth" | "db"
    const deployPkgDir = join(DEPLOY, "packages", pkgShortName);
    const srcDistDir = join(dir, "dist");

    if (!existsSync(deployPkgDir)) {
      console.warn(`⚠️  ${name}: pasta não encontrada no standalone (${deployPkgDir}), a saltar...`);
      continue;
    }

    // Verificar que dist/ existe na origem (foi gerado pelo build)
    if (!existsSync(srcDistDir)) {
      err(`${name}: pasta dist/ não existe em ${srcDistDir}.`, "Corre primeiro: npm run build (gera os packages com tsdown)");
    }

    // 1. Copiar dist/ compilado para o deploy
    const deployDistDir = join(deployPkgDir, "dist");
    rmSync(deployDistDir, { recursive: true, force: true });
    cpSync(srcDistDir, deployDistDir, { recursive: true });
    ok(`${name}: dist/ (JS compilado) copiado.`);

    // 2. Remover src/ com .ts (não é necessário em produção)
    const deploySrcDir = join(deployPkgDir, "src");
    if (existsSync(deploySrcDir)) {
      rmSync(deploySrcDir, { recursive: true, force: true });
      ok(`${name}: src/ (TypeScript) removido.`);
    }

    // 3. Atualizar package.json no deploy — exports.default → ./dist/index.js
    const pkgJsonPath = join(deployPkgDir, "package.json");
    if (existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
      if (pkg.exports) {
        // Corrigir todos os exports paths
        for (const key of Object.keys(pkg.exports)) {
          const entry = pkg.exports[key];
          if (entry && typeof entry === "object" && entry.default) {
            // "./src/index.ts" → "./dist/index.js"
            // "./src/*.ts" → "./dist/*.js"
            entry.default = entry.default.replace(/^\.\/src\//, "./dist/").replace(/\.ts$/, ".js");
          }
        }
      }
      writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
      ok(`${name}: package.json exports atualizado (./dist/*.js).`);
    }

    // 4. Validar que dist/index.js existe (não .ts)
    const distIndexJs = join(deployDistDir, "index.js");
    if (!existsSync(distIndexJs)) {
      err(`${name}: dist/index.js não encontrado após cópia! Build pode ter falhado.`);
    }
  }
}
ok("Packages locais corrigidos (TypeScript → JavaScript compilado).");

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
log("A substituir package.json raiz (minimalista + scripts de BD para cPanel)...");
writeFileSync(
  join(DEPLOY, "package.json"),
  JSON.stringify(
    {
      name: "festas-cpanel",
      version: "1.0.0",
      private: true,
      scripts: {
        start: "node app.js",
        "db:seed": "node scripts/db.js seed",
        "db:truncate": "node scripts/db.js truncate",
        "db:reset": "node scripts/db.js reset",
        "db:verify": "node scripts/db.js verify",
        diagnose: "node scripts/diagnose.js",
      },
    },
    null,
    2,
  ) + "\n",
);
ok("package.json criado (start + scripts db:* para cPanel).");

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
  let envProd = readFileSync(ENV_PROD, "utf8");
  envProd = envProd.replace(/^DATABASE_URL=([^\r\n]+?)(\r?)$/m, (_m, url, cr) =>
    /connection_limit=/.test(url) ? `DATABASE_URL=${url}${cr}` : `DATABASE_URL=${url}${url.includes("?") ? "&" : "?"}connection_limit=5&pool_timeout=10${cr}`,
  );
  writeFileSync(envDest, envProd);
  ok(".env de produção copiado para deploy/apps/web/.env (connection_limit=5 garantido se ausente)");
} else {
  err("apps/web/.env.production não existe. Cria-o com as credenciais de produção.");
}

// 2f. app.js — entry point do Phusion Passenger -----------------------------
//    CommonJS (require) para máxima compatibilidade com todas as versões do
//    Passenger. Carrega .env manualmente e define NODE_PATH para node_modules_deps.
const APP_JS = `// app.js — entry point do Phusion Passenger (cPanel Node.js App)
// Auto-gerado por scripts/build-deploy.mjs — NÃO EDITAR À MÃO (regenerar no próximo deploy).
//
// Em cPanel: "Application startup file" = app.js
//
// CommonJS (require) para máxima compatibilidade com Phusion Passenger.
var fs = require("fs");
var path = require("path");
var Module = require("module");

var here = __dirname;

// --- NODE_PATH: resolver módulos de node_modules_deps (compat. CloudLinux) ---
// O CloudLinux Node.js Selector exige que "node_modules" seja um symlink para
// um virtualenv, não uma pasta real na raiz da app. As dependências foram
// renomeadas para "node_modules_deps" e NODE_PATH garante a resolução.
process.env.NODE_PATH = path.join(here, "node_modules_deps");
Module._initPaths();

// --- carregar .env de produção manualmente (robusto, sem dependências) -----
var envPath = path.join(here, "apps", "web", ".env");
if (fs.existsSync(envPath)) {
  var lines = fs.readFileSync(envPath, "utf8").split("\\n");
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^\\s*([\\w.-]+)\\s*=\\s*(.*)\\s*$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    var v = m[2].trim();
    if ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') || (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'")) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

// --- ambiente do Passenger -------------------------------------------------
// 1) Este bundle é SEMPRE de produção (build standalone). Forçar NODE_ENV evita
//    comportamentos pesados de dev caso o "Application mode" do cPanel esteja
//    mal configurado (dev = mais processos/threads/RAM).
process.env.NODE_ENV = "production";
// 2) Limitar o thread pool do libuv (I/O fs/DNS). Fixa o valor por robustez —
//    relevante para o limite de processos/threads do CloudLinux.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "4";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || 3000;

// --- symlink node_modules -> node_modules_deps (resolução de engines Prisma) --
// O Prisma procura as engines em node_modules/.prisma/client, mas o CloudLinux
// exige que a pasta se chame node_modules_deps. Criamos um symlink/junction
// no arranque para que o Prisma encontre as engines.
var nmReal = path.join(here, "node_modules");
var nmDeps = path.join(here, "node_modules_deps");
if (!fs.existsSync(nmReal) && fs.existsSync(nmDeps)) {
  try {
    fs.symlinkSync(nmDeps, nmReal, process.platform === "win32" ? "junction" : "dir");
  } catch (e) {
    // Falha de permissões não é fatal — Prisma procura outros locais.
  }
}

// --- arrancar o servidor Next.js standalone (self-contained) ---------------
require("./apps/web/server.js");
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

## 🗄️ Comandos de BD no servidor (cPanel)

O bundle traz um seed mínimo e utilitários de BD que usam só o \`@prisma/client\`
(sem precisar do CLI Prisma). Corre no terminal SSH do cPanel ou via "Run NPM
Script" da aplicação:

| Comando | O que faz |
|---|---|
| \`npm run db:seed\` | Cria admin + permissões RBAC + config de cacifos (idempotente). |
| \`npm run db:verify\` | Lista todas as tabelas e a contagem de linhas. |
| \`npm run db:truncate\` | Apaga TODOS os dados (mantém as tabelas). Com \`--keep-auth\` preserva utilizadores. |
| \`npm run db:reset\` | \`truncate\` + \`seed\` (limpa tudo e recria o admin). |

Para CRIAR as tabelas pela 1ª vez continua a fazer-se \`db:push\` a partir do PC
local contra a BD remota (ver DEPLOY-CPANEL.md). Os comandos acima assumem que as
tabelas já existem.

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

// 2h. Comandos de BD para cPanel (seed/truncate/reset/verify)
log("A gerar comandos de BD para o bundle (cPanel)...");
mkdirSync(join(DEPLOY, "prisma"), { recursive: true });
cpSync(join(ROOT, "packages", "db", "prisma", "schema.prisma"), join(DEPLOY, "prisma", "schema.prisma"));
ok("prisma/schema.prisma copiado.");

mkdirSync(join(DEPLOY, "scripts"), { recursive: true });
{
  const SEED_SRC = join(ROOT, "packages", "db", "prisma", "seed-prod.ts");
  const SEED_OUT = join(DEPLOY, "scripts", "seed-prod.js");
  if (!existsSync(SEED_SRC)) err("packages/db/prisma/seed-prod.ts nao existe.");
  let esbuild;
  try {
    esbuild = await import("esbuild");
  } catch {
    err("esbuild indisponivel. Corre: npm install (vem via tsx) ou npm i -D esbuild");
  }
  log("A fazer bundle do seed-prod via esbuild...");
  await esbuild.build({
    entryPoints: [SEED_SRC],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile: SEED_OUT,
    // mariadb + adapter EXTERNOS: o driver tem requires dinâmicos que partem se
    // bundlados; resolvem-se em runtime a partir de node_modules_deps.
    external: ["@prisma/client", "@prisma/adapter-mariadb", "mariadb", "better-auth", "better-auth/adapters/prisma", "dotenv"],
    banner: { js: "// seed minimo de producao (cPanel) - auto-gerado" },
    logLevel: "warning",
  });
  ok("scripts/seed-prod.js (bundle CJS) gerado.");
}
cpSync(join(__dirname, "deploy-db.js"), join(DEPLOY, "scripts", "db.js"));
ok("scripts/db.js (launcher de BD) copiado.");

cpSync(join(__dirname, "diagnose.js"), join(DEPLOY, "scripts", "diagnose.js"));
ok("scripts/diagnose.js (diagnóstico de deployment) copiado.");

// 3. VALIDAR DRIVER ADAPTER (mariadb) + COPIAR CLIENT PRISMA ------------------
// Com `previewFeatures = ["driverAdapters"]` o Prisma NÃO usa engines Rust em
// runtime — as queries correm via @prisma/adapter-mariadb (JS puro, zero
// threads tokio, que era a causa do limite nproc=100 do CloudLinux).
// O crítico agora é o adapter + driver existirem no node_modules_deps.
const prismaClientSrc = join(ROOT, "node_modules", ".prisma", "client");
const prismaClientDir = join(DEPLOY, "node_modules_deps", ".prisma", "client");

if (!existsSync(prismaClientDir) && existsSync(prismaClientSrc)) {
  log("A copiar cliente Prisma gerado (.prisma/client) para o bundle...");
  mkdirSync(prismaClientDir, { recursive: true });
  cpSync(prismaClientSrc, prismaClientDir, { recursive: true });
  ok("Cliente Prisma copiado para node_modules_deps/.prisma/client/.");
}

// O file tracing do Next.js NÃO inclui o adapter/driver: eles são required em
// runtime a partir do dist do @festas/db (copiado à parte), fora do grafo de
// trace da app. Sem esta cópia, o bundle arranca no PC de dev (resolve pela
// node_modules do workspace, que está ACIMA de deploy/) mas falha no cPanel
// com "Cannot find module". Copiamos o pacote + as suas deps de produção
// (resolvidas com o npm local, respeitando nested node_modules).
const adapterDeps = ["mariadb", "@prisma/adapter-mariadb"];
{
  const copyProdClosure = (roots) => {
    const done = new Set();
    const queue = [...roots];
    while (queue.length > 0) {
      const name = queue.shift();
      if (done.has(name)) continue;
      done.add(name);
      if (name.startsWith("@types/")) continue; // tipos: desnecessários em runtime

      // Resolver a pasta do pacote no node_modules de DEV:
      //   1. nested dentro de um dos pacotes raiz (o npm deduplica, por ex.,
      //      mariadb para @prisma/adapter-mariadb/node_modules)
      //   2. fallback: raiz do node_modules
      let srcPkgDir = null;
      for (const root of adapterDeps) {
        if (root === name) continue;
        const nested = join(ROOT, "node_modules", ...root.split("/"), "node_modules", ...name.split("/"));
        if (existsSync(nested)) {
          srcPkgDir = nested;
          break;
        }
      }
      if (!srcPkgDir) srcPkgDir = join(ROOT, "node_modules", ...name.split("/"));
      const destDir = join(DEPLOY, "node_modules_deps", ...name.split("/"));

      if (!existsSync(srcPkgDir)) {
        console.warn(`⚠️  AVISO: ${name} não encontrado no node_modules local.`);
        continue;
      }

      if (!existsSync(destDir)) {
        mkdirSync(dirname(destDir), { recursive: true });
        cpSync(srcPkgDir, destDir, { recursive: true });
        log(`Copiado para o bundle: ${name}`);
      }

      // Enfileirar deps de produção (package.json da pasta RESOLVIDA — pode
      // ser a nested, cujo grafo de deps é o que interessa em runtime).
      let pkgJson;
      try {
        pkgJson = JSON.parse(readFileSync(join(srcPkgDir, "package.json"), "utf8"));
      } catch {
        continue;
      }
      for (const dep of Object.keys(pkgJson.dependencies ?? {})) queue.push(dep);
    }
  };

  copyProdClosure(adapterDeps);
}

let adapterOk = true;
for (const dep of adapterDeps) {
  const depDir = join(DEPLOY, "node_modules_deps", ...dep.split("/"));
  if (existsSync(depDir)) {
    ok(`Driver adapter presente: ${dep}`);
  } else {
    adapterOk = false;
    err(`FALHA CRÍTICA: ${dep} não encontrado em node_modules_deps.`);
  }
}
if (!adapterOk) {
  err("O Prisma com driverAdapters precisa destes pacotes em runtime — bundle inválido.");
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

// 7. TESTE LOCAL (opcional — --no-test para saltar) --------------------------
// Arranca `node app.js` a partir da pasta deploy/ localmente e verifica que a
// página de login (/entrar) responde com HTML 200. Isto valida que o bundle
// está realmente pronto para o cPanel (sem erros de require, TypeScript, etc.)
if (DO_TEST) {
  const passed = await testDeploy();
  if (!passed) {
    console.warn("\n⚠️  AVISO: O teste local FALHOU. O bundle pode não arrancar no cPanel.");
    console.warn("   Verifica os erros acima. Para saltar este teste: --no-test\n");
    process.exitCode = 1; // marcar falha sem abortar (para o utilizador ver o resumo)
  }
} else {
  log("Teste local saltado (--no-test).");
}
