APP="$HOME/app.baselandia.pt"         # raiz da app no cPanel
LOG_DIR="$APP/logs"                   # a app já roda logs aqui (winston)
LOG="$LOG_DIR/recycle.log"

# Limiar de threads da CONTA (soma de todos os processos do utilizador).
# Normal pós-fix: ~13. Limite CloudLinux: 100. 40 dá folga ~2.5x sem falsos
# positivos, mas apanha um órfão de deploy velho (~75) à primeira.
THRESHOLD=40

# Alguns cronds só definem $HOME e $LOGNAME (não $USER).
USER="${USER:-$(id -un)}"

mkdir -p "$LOG_DIR"

{
  echo "=== $(date '+%F %T') ==="

  # 1. Métricas
  P=$(ps -u "$USER" --no-headers 2>/dev/null | wc -l)
  T=$(ps -Lu "$USER" --no-headers 2>/dev/null | wc -l)
  Z=$(ps -u "$USER" -o stat= 2>/dev/null | grep -c Z)
  # Órfãos da app: node/next-server adotados pelo init (PPID=1) - sobra de
  # restart/deploy que o app server já não controla.
  O=$(ps -u "$USER" -o ppid=,comm= 2>/dev/null | awk '$1==1 && $2 ~ /node|next-server|Passenger/' | wc -l)
  echo "metricas: processos=$P threads=$T zombies=$Z orfaos=$O"

  # 2. Decisão
  if [ "$T" -le "$THRESHOLD" ] && [ "$Z" -eq 0 ] && [ "$O" -eq 0 ]; then
    echo "OK (threads=${T}<=${THRESHOLD}, sem zombies/orfaos) - sem reciclagem"
  else
    echo "ANOMALIA (threads=${T} zombies=${Z} orfaos=${O}) - a reciclar..."

    # Termina processos node órfãos/obsoletos (TERM = gracioso). A app renasce
    # no próximo request. Este script corre como bash (sem 'node' no cmdline).
    pkill -u "$USER" -f "node" 2>/dev/null
    pkill -u "$USER" -f "PassengerNodeApp" 2>/dev/null

    # Restart oficial do Passenger (gracioso): o novo processo nasce primeiro,
    # o antigo é drenado.
    mkdir -p "$APP/tmp"
    touch "$APP/tmp/restart.txt"
    echo "reciclagem concluida (pkill + tmp/restart.txt)"
  fi
} >> "$LOG" 2>&1
