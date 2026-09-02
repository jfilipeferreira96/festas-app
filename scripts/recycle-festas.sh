#!/bin/bash
# =============================================================================
# recycle-festas.sh — Reciclagem diária + métricas (cron 02:00)
# =============================================================================
# MITIGAÇÃO para o limite de processos do CloudLinux (cPanel + Passenger).
#
# O QUE FAZ
#   1. Regista num log (logs/recycle.log) as métricas ANTES da reciclagem:
#      nº de processos, threads e zombies do utilizador — para perceber
#      se a contagem cresce ao longo do dia (acumulação gradual) ou se volta
#      ao máximo logo após restart (baseline alto, p.ex. threads da engine
#      do Prisma dimensionadas pelos CPUs do host).
#   2. Termina processos node órfãos/obsoletos da app (a app renasce logo).
#   3. Pede restart GRACIOSO ao Passenger via tmp/restart.txt (o mecanismo
#      oficial — NÃO usar pkill como forma de restart).
#
# INSTALAÇÃO (cPanel)
#   1. Enviar este ficheiro para a raiz da CONTA (~/recycle-festas.sh)
#      — NÃO dentro da pasta da app, para sobreviver a deploys.
#   2. Ajustar APP abaixo se a pasta da app mudar. Nesta conta a app
#      corre em ~/app.baselandia.pt (subdomínio app.baselandia.pt).
#   3. chmod +x ~/recycle-festas.sh
#   4. cPanel → Cron Jobs → Add New Cron Job:
#        Minute: 0  Hour: 2  Day: *  Month: *  Weekday: *
#        Command: /bin/bash $HOME/recycle-festas.sh
#
# NOTA SERVIDOR
#   A conta tem nodevenv/ (CloudLinux Node Selector) e lscache/ — o app server
#   pode ser Passenger OU LiteSpeed/LSAPI. O restart.txt é a via oficial do
#   Passenger; o pkill do passo 2 garante a reciclagem em qualquer um dos
#   casos (o app server renasce a app no próximo request). Se após o 1.º dia
#   o log não mostrar reciclagem (threads iguais), usar também o botão
#   "Restart" da app no cPanel como teste manual.
#
# INTERPRETAÇÃO DO LOG (após 3–5 dias)
#   - threads sobem ao longo do dia e descem após restart → acumulação gradual
#     (o cron resolve o sintoma; investigar causa)
#   - threads voltam ao mesmo valor logo após restart → baseline alto
#     (focar em connection_limit, nproc do host, driver adapter)
#   - zombies > 0 persistentes → órfãos de deploys anteriores
# =============================================================================

APP="$HOME/app.baselandia.pt"         # raiz da app no cPanel (subdomínio app.baselandia.pt)
LOG_DIR="$APP/logs"                   # a app já roda logs aqui (winston, cwd = raiz da app)
LOG="$LOG_DIR/recycle.log"

# Alguns cronds só definem $HOME e $LOGNAME (não $USER) — garantir que as
# métricas (ps -u) e o pkill -u funcionam em qualquer ambiente cron.
USER="${USER:-$(id -un)}"

mkdir -p "$LOG_DIR"

{
  echo "=== $(date '+%F %T') ==="

  # 1. Métricas ANTES da reciclagem
  P=$(ps -u "$USER" --no-headers 2>/dev/null | wc -l)
  T=$(ps -Lu "$USER" --no-headers 2>/dev/null | wc -l)
  Z=$(ps -u "$USER" -o stat= 2>/dev/null | grep -c Z)
  echo "antes: processos=$P threads=$T zombies=$Z"

  # 2. Terminar processos node órfãos/obsoletos da app (TERM = gracioso).
  #    O Passenger arranca a app como "node .../app.js" / "PassengerNodeApp"
  #    (o require do server.js é in-process) — por isso o padrão 'node'.
  #    Este script corre como bash (sem 'node' no cmdline), não se mata a si
  #    próprio. Zombies (defunct) só desaparecem quando o processo-pai morre —
  #    este pkill limpa-os indiretamente se o pai for um processo da app.
  pkill -u "$USER" -f "node" 2>/dev/null
  pkill -u "$USER" -f "PassengerNodeApp" 2>/dev/null

  # 3. Restart oficial do Passenger (gracioso): novo processo nasce primeiro,
  #    o antigo é drenado. Passenger renasce a app no próximo request.
  mkdir -p "$APP/tmp"
  touch "$APP/tmp/restart.txt"
  echo "restart solicitado (tmp/restart.txt)"
} >> "$LOG" 2>&1
