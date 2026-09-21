#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Fecho automático de dia - BaseLandia (cron cPanel)
#
# O QUE FAZ: fecha as festas do dia (RESERVA/CONFIRMADO/EM_CURSO → CONCLUIDA)
# e liberta/limpa os cacifos atribuídos. No dia seguinte o parque começa limpo.
#
# CONFIGURAÇÃO (ou definidas no ambiente do cPanel):
#   APP_URL          - ex.: https://app.baselandia.pt
#   FECHO_DIA_SECRET - mesmo valor de FECHO_DIA_SECRET no .env da app
#
# CRON no cPanel (todos os dias às 23:55, hora do servidor):
#   55 23 * * * /home/UTILIZADOR/fecho-dia.sh >> /home/UTILIZADOR/fecho-dia.log 2>&1
# ─────────────────────────────────────────────────────────────
set -u

APP_URL="${APP_URL:-https://app.baselandia.pt}"
FECHO_DIA_SECRET="${FECHO_DIA_SECRET:-}"

if [ -z "$FECHO_DIA_SECRET" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: FECHO_DIA_SECRET não definido."
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] A executar fecho do dia em $APP_URL ..."
curl -sS -X POST "$APP_URL/api/fecho-dia" \
  -H "Content-Type: application/json" \
  -H "x-fecho-secret: $FECHO_DIA_SECRET" \
  -d '{}'
echo ""
