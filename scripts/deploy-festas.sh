#!/usr/bin/env bash
# ============================================================================
# deploy-festas.sh - DEPLOY DE PRODUÇÃO NUM COMANDO (Terminal do cPanel)
# ============================================================================
# Resolve o problema do "stacking": o Restart do cPanel arranca um processo
# novo mas NÃO mata o antigo, que fica órfão (PPID=1) a consumir 11 threads
# para sempre. Este script mata TODOS os processos da app antes de reiniciar.
#
# USO (fluxo completo):
#   1. (PC local)     npm run deploy            → gera deploy.tar.gz (raiz repo)
#   2. (File Manager) upload do deploy.tar.gz  → para a pasta HOME (~/)
#   3. (Terminal)     bash ~/deploy-festas.sh   → faz TUDO o resto sozinho
#
# USO avançado:
#   bash ~/deploy-festas.sh /caminho/para/outro.tar.gz   # tarball alternativo
#
# O que faz:
#   ✔ valida o tarball (app.js na raiz, WASM do Prisma, zero engines Rust)
#   ✔ snapshot de métricas antes (processos/threads) → logs/deploy.log
#   ✔ backup de .env + uploads/ + tarball anterior (rotação de 3)
#   ✔ MATA todos os processos next-server/Passenger da conta (TERM→KILL)
#   ✔ extrai o tarball por cima da app
#   ✔ restaura .env e uploads/ preservados
#   ✔ SYNC DE SCHEMA: se o bundle trouxer prisma/schema-diff.sql, aplica-o de
#     forma idempotente (scripts/db.js sync-schema) antes de reiniciar - procura
#     o binário node em caminhos típicos do cPanel. Sem diff = passo no-op
#     (não bloqueia o deploy nem depende do node).
#   ✔ touch tmp/restart.txt (Passenger renasce limpo - só 1 processo)
#   ✔ verifica: 1 processo, NLWP ≤ 15, HTTP 200/307
#   ✖ em caso de falha → ROLLBACK automático (tarball anterior) se existir
#
# Instalação (uma só vez): upload deste ficheiro para ~/ via File Manager.
# ============================================================================

APP="${FESTAS_APP_DIR:-$HOME/app.baselandia.pt}"
TARBALL="${1:-$HOME/deploy.tar.gz}"
APP_URL="${FESTAS_APP_URL:-https://app.baselandia.pt}"
BACKUP_ROOT="$HOME/deploy-backups"
STAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP="$BACKUP_ROOT/$STAMP"
BACKUPS_KEEP=3
LOG_DIR="$APP/logs"
LOG="$LOG_DIR/deploy.log"
USER="${USER:-$(id -un)}"

# Normal pós-fix (engineType="client"): 11 threads. 15 dá margem sem falsear.
NLWP_MAX=15

# ── output ──────────────────────────────────────────────────────────────────
say()  { printf '\033[36m[deploy]\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m[  OK  ]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[ WARN ]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[ FAIL ]\033[0m %s\n' "$*"; echo "[FAIL] $*" >> "$LOG"; exit 1; }

# ── métricas da conta (CloudLinux conta processos E threads) ────────────────
metrics() {
  PROCS=$(ps -u "$USER" --no-headers 2>/dev/null | wc -l)
  THREADS=$(ps -Lu "$USER" --no-headers 2>/dev/null | wc -l)
}

# lista processos next-server da conta: "PID NLWP ARGS"
app_procs() { ps -u "$USER" -o pid=,nlwp=,args= 2>/dev/null | grep '[n]ext-server'; }

# mata todos os processos da app (gracioso → forçado)
kill_app() {
  say "A terminar processos da app (next-server / Passenger)..."
  pkill -u "$USER" -f "next-server"      2>/dev/null
  pkill -u "$USER" -f "PassengerNodeApp" 2>/dev/null
  sleep 3
  # sobras que ignoraram o TERM → KILL
  if pgrep -u "$USER" -f "next-server" >/dev/null 2>&1; then
    warn "Processos ignoraram SIGTERM - a forçar (SIGKILL)..."
    pkill -9 -u "$USER" -f "next-server"      2>/dev/null
    pkill -9 -u "$USER" -f "PassengerNodeApp" 2>/dev/null
    sleep 1
  fi
  if pgrep -u "$USER" -f "next-server" >/dev/null 2>&1; then
    fail "Ainda há processos next-server após SIGKILL - verifica manualmente: ps -u $USER -o pid,ppid,nlwp,args"
  fi
  ok "Zero processos next-server (sem stacking)."
}

# extrai um tarball para a app
extract_to_app() {
  local tb="$1"
  tar -xzf "$tb" -C "$APP" 2>>"$LOG" || fail "Extração falhou de '$tb' - verifica espaço em disco (quota) e permissões."
}

# reinício gracioso do Passenger
restart_passenger() {
  mkdir -p "$APP/tmp"
  touch "$APP/tmp/restart.txt"
}

# rollback: re-extrai o tarball anterior mais recente (se existir) e reinicia
rollback() {
  warn "ROLLBACK - a restaurar o bundle anterior..."
  local prev
  prev=$(ls -1d "$BACKUP_ROOT"/*/deploy.tar.gz 2>/dev/null | grep -v "$BACKUP/" | sort -r | head -1)
  if [ -n "$prev" ]; then
    kill_app
    extract_to_app "$prev"
    # restaurar .env/uploads do backup atual (estado pré-deploy)
    [ -f "$BACKUP/apps-web.env" ]      && cp "$BACKUP/apps-web.env" "$APP/apps/web/.env"
    [ -d "$BACKUP/uploads" ]           && cp -a "$BACKUP/uploads/." "$APP/apps/web/public/uploads/" 2>/dev/null
    restart_passenger
    fail "Rollback aplicado ($prev). Investiga o erro acima e volta a tentar."
  else
    [ -f "$BACKUP/apps-web.env" ] && cp "$BACKUP/apps-web.env" "$APP/apps/web/.env"
    fail "Sem tarball anterior para rollback. .env restaurado. Para voltar atrás: re-upload do bundle anterior + 'bash ~/deploy-festas.sh <tarball>'."
  fi
}

mkdir -p "$LOG_DIR"
{
  echo ""
  echo "================ $(date '+%F %T') - deploy-festas ================"
} >> "$LOG"

say "Deploy festas → $APP  (tarball: $TARBALL)"

# ── 1. PRÉ-CHECKS ───────────────────────────────────────────────────────────
[ -d "$APP" ]         || fail "Pasta da app não existe: $APP (ajusta FESTAS_APP_DIR)"
[ -f "$TARBALL" ]     || fail "Tarball não encontrado: $TARBALL (faz upload via File Manager ou passa o caminho como 1º argumento)"

say "A validar conteúdo do tarball..."
tar -tzf "$TARBALL" 2>/dev/null | grep -qx "app.js" || fail "Tarball inválido: 'app.js' não está na raiz (esperado: app.js, package.json, apps/, node_modules/...)"
ok "app.js na raiz do tarball."

# ── 2. MÉTRICAS ANTES ───────────────────────────────────────────────────────
metrics
say "Antes:      processos=$PROCS threads=$THREADS"
echo "[metrics] antes: processos=$PROCS threads=$THREADS" >> "$LOG"
app_procs | while read -r pid nlwp rest; do echo "  - processo existente: PID=$pid NLWP=$nlwp"; done

# ── 3. BACKUP (.env + uploads + tarball) ────────────────────────────────────
say "Backup de .env, uploads/ e tarball → $BACKUP"
mkdir -p "$BACKUP"
[ -f "$APP/apps/web/.env" ] && cp "$APP/apps/web/.env" "$BACKUP/apps-web.env"
if [ -d "$APP/apps/web/public/uploads" ]; then
  cp -a "$APP/apps/web/public/uploads" "$BACKUP/uploads"
fi
cp "$TARBALL" "$BACKUP/deploy.tar.gz"
ok "Backup completo."

# rotação: manter só os $BACKUPS_KEEP mais recentes
ls -1d "$BACKUP_ROOT"/*/ 2>/dev/null | sort -r | tail -n +$((BACKUPS_KEEP + 1)) | while read -r old; do
  rm -rf "$old" && echo "[backup] removido antigo: $old" >> "$LOG"
done

# ── 4. MATAR TUDO (o passo que o Restart do cPanel NÃO faz) ─────────────────
kill_app

# ── 4b. LIMPAR ARTEFACTOS DA VERSÃO ANTERIOR ────────────────────────────────
say "A limpar artefactos da versão anterior (.next, node_modules_deps, packages, src)..."
rm -rf "$APP/apps/web/.next" \
       "$APP/node_modules_deps" \
       "$APP/packages" \
       "$APP/apps/web/src" \
       "$APP/apps/web/server.js"
ok "Artefactos antigos removidos."

# ── 5. EXTRAIR NOVO BUNDLE ──────────────────────────────────────────────────
say "A extrair novo bundle para $APP ..."
extract_to_app "$TARBALL"
ok "Extração concluída."

# sincronizar este script com a cópia do bundle (LF garantido, sem CRLF)
[ -f "$APP/deploy-festas.sh" ] && cp -f "$APP/deploy-festas.sh" "$HOME/deploy-festas.sh" 2>/dev/null

# ── 6. RESTAURAR .env + uploads PRESERVADOS ────────────────────────────────
[ -f "$BACKUP/apps-web.env" ] && cp "$BACKUP/apps-web.env" "$APP/apps/web/.env" && ok ".env de produção preservado."
mkdir -p "$APP/apps/web/public/uploads"
[ -d "$BACKUP/uploads" ] && cp -a "$BACKUP/uploads/." "$APP/apps/web/public/uploads/" 2>/dev/null && ok "uploads/ preservados."

# ── 6b. SYNC DE SCHEMA (só se o bundle trouxer um diff) ─────────────────────
# O bundle pode trazer prisma/schema-diff.sql (diff calculado no PC antes de
# empacotar). scripts/db.js sync-schema aplica-o de forma IDEMPOTENTE (instruções
# já aplicadas são ignoradas). SEM diff = schema já sincronizado = no-op total
# (não bloqueia o deploy nem depende do node estar no PATH).
DIFF_SQL="$APP/prisma/schema-diff.sql"
if [ ! -f "$DIFF_SQL" ] || [ ! -s "$DIFF_SQL" ]; then
  ok "Sem schema-diff.sql no bundle - schema já sincronizado (nada a aplicar)."
else
  # Localizar o binário node (o PATH do SSH do cPanel nem sempre o inclui).
  NODE_BIN="$(command -v node 2>/dev/null || true)"
  if [ -z "$NODE_BIN" ]; then
    for CAND in /opt/alt/alt-nodejs*/root/usr/bin/node "$HOME"/nodevenv/*/bin/node /usr/local/bin/node /usr/bin/node; do
      if [ -x "$CAND" ]; then NODE_BIN="$CAND"; break; fi
    done
  fi
  if [ -n "$NODE_BIN" ]; then
    say "A sincronizar schema da BD (sync-schema)..."
    if "$NODE_BIN" "$APP/scripts/db.js" sync-schema; then
      ok "Schema sincronizado com o bundle."
    else
      fail "Falha no sync de schema - aplica manualmente: $NODE_BIN $APP/scripts/db.js sync-schema"
    fi
  else
    warn "Binário 'node' não encontrado - sync de schema NÃO executado (o bundle TEM diff!)."
    warn "Aplica manualmente após ativar o Node.js: cd $APP && node scripts/db.js sync-schema"
    echo "[WARN] node indisponível - sync-schema saltado" >> "$LOG"
  fi
fi

# ── 7. VALIDAR PRISMA WASM (o fix anti-threads) ────────────────────────────
PRISMA_DIR="$APP/node_modules_deps/.prisma/client"
say "A validar cliente Prisma (engineType=client / WASM)..."
if [ ! -f "$PRISMA_DIR/query_compiler_bg.wasm" ]; then
  warn "query_compiler_bg.wasm em falta - bundle gerado sem engineType=\"client\"?"
  rollback
fi
RUST=$(ls -1 "$PRISMA_DIR" 2>/dev/null | grep -c '\.node$')
if [ "$RUST" -gt 0 ]; then
  warn "Encontradas $RUST engines Rust (.node) no bundle - voltaria a criar ~64 threads!"
  rollback
fi
ok "Prisma WASM validado (query_compiler_bg.wasm, zero engines Rust)."

# ── 8. REINICIAR (Passenger renasce com UM processo) ────────────────────────
say "A reiniciar via Passenger (tmp/restart.txt)..."
restart_passenger
ok "restart.txt tocado."

# ── 9. ESPERAR ARRANQUE + VERIFICAR ─────────────────────────────────────────
say "A esperar arranque (verificação HTTP em $APP_URL)..."
HTTP=""
for i in $(seq 1 15); do
  # 1º request força o Passenger a fazer spawn do processo da app
  HTTP=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$APP_URL" 2>/dev/null)
  [ "$HTTP" = "200" ] || [ "$HTTP" = "307" ] || [ "$HTTP" = "302" ] && break
  sleep 2
done

say "HTTP=$HTTP  |  processos next-server:"
FOUND=$(app_procs | wc -l)
app_procs | while read -r pid nlwp rest; do echo "    PID=$pid NLWP=$nlwp"; done

if [ "$FOUND" -eq 0 ]; then
  warn "App não arrancou (nenhum processo next-server)."
  rollback
fi
if [ "$FOUND" -gt 1 ]; then
  warn "Detectados $FOUND processos next-server (esperado: 1) - stacking!"
  # mata TODOS e deixa o Passenger renascer um único
  kill_app
  restart_passenger
  sleep 3
  curl -sk -o /dev/null --max-time 10 "$APP_URL" >/dev/null 2>&1
  FOUND=$(app_procs | wc -l)
  if [ "$FOUND" -gt 1 ]; then
    fail "Ainda $FOUND processos após normalização - verifica: ps -u $USER -o pid,ppid,nlwp,args"
  fi
fi

# NLWP do processo único
NLWP=$(app_procs | head -1 | awk '{print $2}')
if [ -n "$NLWP" ] && [ "$NLWP" -gt "$NLWP_MAX" ]; then
  warn "Processo com NLWP=$NLWP (> $NLWP_MAX) - bundle com engine Rust?"
  rollback
fi

if [ "$HTTP" != "200" ] && [ "$HTTP" != "307" ] && [ "$HTTP" != "302" ]; then
  warn "Resposta HTTP inesperada: $HTTP (esperado 200/307)."
  rollback
fi

# ── 10. RESUMO FINAL ────────────────────────────────────────────────────────
metrics
say "Depois:     processos=$PROCS threads=$THREADS"
say "App:        $APP_URL (HTTP $HTTP)"
say "Processo:   1 x next-server, NLWP=$NLWP (limite $NLWP_MAX)"
ok "DEPLOY CONCLUÍDO COM SUCESSO ✔"
echo "[fim] sucesso: processos=$PROCS threads=$THREADS http=$HTTP nlwp=$NLWP" >> "$LOG"
