#!/usr/bin/env bash
# Dispara a geração diária de cobranças recorrentes. Chamado pelo crontab da
# VPS 1x/dia. Lê o CRON_SECRET do .env (não fica exposto no crontab) e bate no
# endpoint protegido.
#
# Instalação na VPS (uma vez):
#   chmod +x /root/fecho/deploy/cron/generate-charges.sh
#   crontab -e
#   # e adicione a linha (roda todo dia às 06:00):
#   0 6 * * * /root/fecho/deploy/cron/generate-charges.sh >> /var/log/fecho-cron.log 2>&1
set -euo pipefail

ENV_FILE="/root/fecho/.env"
URL="https://fechoapp.com.br/api/cron/generate-charges"

CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')"

if [ -z "${CRON_SECRET}" ]; then
  echo "$(date -Is) ERRO: CRON_SECRET não encontrado em ${ENV_FILE}" >&2
  exit 1
fi

echo "$(date -Is) disparando geração de cobranças..."
curl -fsS -X POST "${URL}" -H "Authorization: Bearer ${CRON_SECRET}"
echo ""
