#!/bin/bash
# =============================================================================
# limpa-processos.sh — EMERGÊNCIA: libertar processos/threads da conta
# =============================================================================
# PARA QUÊ
#   Quando a conta atinge o limite de processos do CloudLinux (100/100), o SSH,
#   Terminal e até o File Manager podem falhar (não há slots para novos
#   processos). O cron continua a tentar correr a cada minuto — mais cedo ou
#   tarde apanha um slot livre e este script limpa os processos da app,
#   libertando dezenas de slots de uma vez. O Passenger/LiteSpeed renasce a
#   app automaticamente no próximo request do site.
#
# PROTEÇÕES (para não derrubar a app sem necessidade)
#   - SÓ AGE se o total de threads/processos estiver acima de THRESHOLD (85).
#     Abaixo disso, apenas regista métricas no log e não faz nada.
#   - COOLDOWN de 5 minutos entre limpezas (evita "flapping").
#   - Argumento "force" salta as proteções: /bin/bash limpa-processos.sh force
#
# INSTALAÇÃO (cPanel, sem terminal)
#   1. File Manager → enviar este ficheiro para a RAIZ da conta:
#        /home/baselandia/limpa-processos.sh
#   2. Cron Jobs → Add New Cron Job:
#        Minute: *  Hour: *  Day: *  Month: *  Weekday: *
#        Command: /bin/bash $HOME/limpa-processos.sh
#   3. Esperar 1-3 minutos (o cron precisa de apanhar um slot livre).
#   4. Quando recuperares o acesso: ⚠️ REMOVER ESTE CRON ⚠️ e deixar apenas o
#      recycle-festas.sh das 02:00. Este script é boia de salvamento, não é
#      solução permanente.
#
# LOG
#   ~/app.baselandia.pt/logs/emergency-clean.log (fallback: ~/emergency-clean.log)
# =============================================================================

USER="${USER:-$(id -un)}"
APP="$HOME/app.baselandia.pt"
LOG="$APP/logs/emergency-clean.log"
STAMP="$HOME/.limpa-last"     # marcação temporal da última limpeza (cooldown)
THRESHOLD=85                  # só limpar acima disto (limite da conta = 100)
COOLDOWN=300                  # segundos mínimos entre limpezas

# Garantir que há log utilizável (fallback se a pasta da app não estiver acessível)
mkdir -p "$APP/logs" 2>/dev/null || LOG="$HOME/emergency-clean.log"

# --- métricas ----------------------------------------------------------------
P=$(ps -u "$USER" --no-headers 2>/dev/null | wc -l)          # processos
T=$(ps -Lu "$USER" --no-headers 2>/dev/null | wc -l)         # threads (total tasks)
Z=$(ps -u "$USER" -o stat= 2>/dev/null | grep -c Z)          # zombies

# --- cooldown ----------------------------------------------------------------
LAST=0
[ -f "$STAMP" ] && LAST=$(cat "$STAMP" 2>/dev/null)
NOW=$(date +%s)

{
  echo "=== $(date '+%F %T') === processos=$P threads=$T zombies=$Z"

  if [ "$1" != "force" ]; then
    if [ "$T" -lt "$THRESHOLD" ]; then
      echo "abaixo do threshold ($THRESHOLD) — nada a fazer"
      exit 0
    fi
    if [ $((NOW - LAST)) -lt "$COOLDOWN" ]; then
      echo "cooldown ativo (última limpeza há $((NOW - LAST))s) — nada a fazer"
      exit 0
    fi
  fi

  echo "A LIMPAR processos da app (threads=$T >= $THRESHOLD)..."

  # Matar processos node da conta. O Passenger arranca a app como
  # "node .../app.js" / "PassengerNodeApp" — o padrão 'node' apanha ambos.
  # Este script corre como bash (sem 'node' no cmdline), pelo que não se
  # mata a si próprio. Zombies com pai node são limpos indiretamente.
  pkill -KILL -u "$USER" -f "node" 2>/dev/null
  pkill -KILL -u "$USER" -f "PassengerNodeApp" 2>/dev/null

  # Pedir restart gracioso ao Passenger (renasce a app no próximo request).
  mkdir -p "$APP/tmp" 2>/dev/null
  touch "$APP/tmp/restart.txt" 2>/dev/null

  echo "$NOW" > "$STAMP"
  echo "limpeza concluída — slots libertados; app renasce no próximo request"
} >> "$LOG" 2>&1
