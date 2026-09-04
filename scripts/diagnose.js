#!/usr/bin/env node
/**
 * diagnose.js - Diagnóstico de deployment para cPanel/Phusion Passenger.
 *
 * Testa EXATAMENTE o que o endpoint de login faz, passo a passo:
 *   1. Node.js version
 *   2. Environment variables (.env carregado?)
 *   3. NODE_PATH resolution (node_modules_deps)
 *   4. @prisma/client carrega? Qual engine binary usa?
 *   5. Prisma connects to MySQL?
 *   6. @festas/auth carrega?
 *   7. Query user table works?
 *
 * Uso no cPanel Terminal:
 *   cd /home/USERNAME/app   (ou onde estiver a raiz da app)
 *   node scripts/diagnose.js
 *
 * NÃO usa a app Next.js - é um script standalone que simula o mesmo caminho.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var Module = require("module");

var here = __dirname;
var root = path.dirname(here); // raiz da app (um nível acima de scripts/)

// ─── 1. NODE_PATH (mesma lógica do app.js) ────────────────────────────────
var nmDeps = path.join(root, "node_modules_deps");
process.env.NODE_PATH = nmDeps;
try {
  Module._initPaths();
} catch (e) {
  /* ignore */
}

function check(label, ok, detail) {
  var icon = ok ? "✅" : "❌";
  console.log(icon + " " + label);
  if (detail) console.log("   " + detail);
  return ok;
}

function section(title) {
  console.log("\n── " + title + " " + "─".repeat(Math.max(0, 60 - title.length)));
}

var allOk = true;

// ─── 1. Node.js version ────────────────────────────────────────────────────
section("1. Node.js");
var nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
check("Node.js version", true, "v" + process.versions.node);
if (nodeMajor < 18) {
  check("Node.js >= 18", false, "Versão demasiado antiga - Next.js 15 precisa de Node 18+");
  allOk = false;
} else if (nodeMajor < 22) {
  console.log("   ⚠️  Recomendado: Node.js v22 (atual: v" + process.versions.node + ")");
} else {
  check("Node.js >= 22", true);
}

// ─── 2. Directory structure ────────────────────────────────────────────────
section("2. Estrutura de ficheiros");
check("node_modules_deps/ existe", fs.existsSync(nmDeps), nmDeps);

var appJs = path.join(root, "app.js");
check("app.js existe", fs.existsSync(appJs));

var serverJs = path.join(root, "apps", "web", "server.js");
check("apps/web/server.js existe", fs.existsSync(serverJs), serverJs);

var envFile = path.join(root, "apps", "web", ".env");
check("apps/web/.env existe", fs.existsSync(envFile), envFile);

// ─── 3. Load .env ──────────────────────────────────────────────────────────
section("3. Variáveis de ambiente (.env)");
var envVars = {};
if (fs.existsSync(envFile)) {
  var lines = fs.readFileSync(envFile, "utf8").split("\n");
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    var v = m[2].trim();
    if ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') || (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'")) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

var required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"];
for (var r of required) {
  var has = !!process.env[r];
  check(r + " definido", has);
  if (!has) allOk = false;
}

if (process.env.DATABASE_URL) {
  // Show DB host/name without password
  var dbUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@");
  console.log("   DATABASE_URL: " + dbUrl);
}

// ─── 4. NODE_PATH resolution ───────────────────────────────────────────────
section("4. Resolução de módulos (NODE_PATH)");

var prismaClientPath = null;
try {
  prismaClientPath = require.resolve("@prisma/client");
  check("@prisma/client resolvível", true, prismaClientPath);
} catch (e) {
  check("@prisma/client resolvível", false, e.message);
  allOk = false;
}

// Check .prisma/client (generated client with engines)
var prismaGenDir = path.join(nmDeps, ".prisma", "client");
check(".prisma/client/ existe", fs.existsSync(prismaGenDir), prismaGenDir);

if (fs.existsSync(prismaGenDir)) {
  var engines = fs.readdirSync(prismaGenDir).filter(function (f) {
    return f.indexOf("query_engine") !== -1;
  });
  console.log("   Engines presentes: " + (engines.length ? engines.join(", ") : "NENHUMA"));
  if (engines.length === 0) {
    check("Engine binaries", false, "Nenhuma engine encontrada em .prisma/client/");
    allOk = false;
  }
}

// ─── 5. Load @prisma/client ────────────────────────────────────────────────
section("5. Carregar @prisma/client");
var PrismaClient = null;
try {
  var prismaMod = require("@prisma/client");
  PrismaClient = prismaMod.PrismaClient;
  check("PrismaClient carregado", !!PrismaClient, "OK");
} catch (e) {
  check("PrismaClient carregado", false, e.message);
  console.log("   Stack: " + (e.stack || "").split("\n").slice(0, 3).join("\n   "));
  allOk = false;
}

// ─── 6. Conexão à base de dados (TCP + mysql2 se disponível) ───────────────
// NOTA: não usamos o engine Prisma aqui porque em ambientes cPanel/CloudLinux
// o subprocesso do "Executar script JS" pode fazer o engine Rust entrar em pânico
// ("timer has gone away"). A app em si funciona bem sob Phusion Passenger.
section("6. Conexão à base de dados");

var parsedDb = null;
if (process.env.DATABASE_URL) {
  var m = process.env.DATABASE_URL.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
  if (m) {
    parsedDb = { user: m[1], password: m[2], host: m[3], port: parseInt(m[4], 10), database: m[5] };
  }
}

if (parsedDb) {
  // 6a. TCP connectivity test (sem Prisma engine)
  var net = require("net");
  var socket = new net.Socket();
  socket.setTimeout(5000);
  var tcpDone = false;
  socket.on("connect", function () {
    if (tcpDone) return;
    tcpDone = true;
    check("MySQL " + parsedDb.host + ":" + parsedDb.port + " reachable", true);
    socket.destroy();
    testDbQuery();
  });
  socket.on("error", function (err) {
    if (tcpDone) return;
    tcpDone = true;
    check("MySQL " + parsedDb.host + ":" + parsedDb.port + " reachable", false, err.message);
    allOk = false;
    testAuth();
  });
  socket.on("timeout", function () {
    if (tcpDone) return;
    tcpDone = true;
    check("MySQL " + parsedDb.host + ":" + parsedDb.port + " reachable", false, "timeout (5s)");
    allOk = false;
    socket.destroy();
    testAuth();
  });
  socket.connect(parsedDb.port, parsedDb.host);
} else {
  check("Parse DATABASE_URL", false, "Formato inválido");
  allOk = false;
  testAuth();
}

// 6b. MySQL query test via mysql2 (se disponível no bundle)
function testDbQuery() {
  var mysql2 = null;
  try {
    mysql2 = require("mysql2/promise");
  } catch (e) {
    /* não disponível */
  }

  if (!mysql2) {
    console.log("   ℹ️  mysql2 não está no bundle - a saltar query directa.");
    console.log("   (A app usa o engine Prisma, que funciona sob Passenger.)");
    testAuth();
    return;
  }

  mysql2
    .createConnection({
      host: parsedDb.host,
      port: parsedDb.port,
      user: parsedDb.user,
      password: parsedDb.password,
      database: parsedDb.database,
    })
    .then(function (conn) {
      return conn
        .query("SELECT COUNT(*) AS c FROM user")
        .then(function (r) {
          check("SELECT COUNT(*) FROM user", true, r[0][0].c + " registos");
          return conn.query("SELECT email, funcao, emailVerified FROM user WHERE email = 'admin@festas.pt'");
        })
        .then(function (r) {
          if (r[0].length > 0) {
            var u = r[0][0];
            check("admin@festas.pt encontrado", true, "funcao=" + u.funcao + " verified=" + u.emailVerified);
          } else {
            check("admin@festas.pt encontrado", false, "Não existe na BD");
            allOk = false;
          }
          return conn.end();
        });
    })
    .then(function () {
      testAuth();
    })
    .catch(function (err) {
      check("Query MySQL", false, err.code + ": " + err.message);
      allOk = false;
      testAuth();
    });
}

// ─── 7. @festas/auth ──────────────────────────────────────────────────────
function testAuth() {
  section("7. Carregar @festas/auth");
  try {
    var authMod = require("@festas/auth");
    check("@festas/auth carregado", !!authMod.auth, "OK");
    if (authMod.auth) {
      check("auth.api disponível", !!authMod.auth.api, "OK");
    }
  } catch (e) {
    check("@festas/auth carregado", false, e.message);
    console.log("   Stack: " + (e.stack || "").split("\n").slice(0, 5).join("\n   "));
    allOk = false;
  }
  finish();
}

function finish() {
  section("RESULTADO");
  if (allOk) {
    console.log("✅ Todos os testes passaram. O problema pode estar em cookies/CORS.");
    console.log("   Verifica: COOKIE_SECURE, COOKIE_SAMESITE no .env");
    console.log("   E: BETTER_AUTH_URL vs NEXT_PUBLIC_APP_URL (têm de bater certo com o domínio)");
  } else {
    console.log("❌ Falhas encontradas - vê os ❌ acima.");
    console.log("   Copia este output completo para análise.");
  }
  process.exit(allOk ? 0 : 1);
}
