#!/usr/bin/env bash
# Dispara a geração diária de cobranças recorrentes. Chamado pelo cron da VPS
# 1x/dia. Lê o CRON_SECRET do .env (não fica exposto no crontab) e bate no
# endpoint protegido.
#
# Configure pelas variáveis de ambiente (ou edite os defaults abaixo):
#   APP_DIR  — diretório onde o repo foi clonado (contém o .env)
#   APP_URL  — URL pública da sua instância
#
# Instalação na VPS (uma vez):
#   chmod +x "$APP_DIR/deploy/cron/generate-charges.sh"
#   sudo cp deploy/cron/fecho /etc/cron.d/fecho   # ajuste os caminhos lá
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fecho}"
APP_URL="${APP_URL:-https://SEU-DOMINIO.com.br}"

ENV_FILE="${APP_DIR}/.env"
URL="${APP_URL}/api/cron/generate-charges"

if [ ! -f "$ENV_FILE" ]; then
  echo "$(date -Is) ERRO: ${ENV_FILE} não encontrado (ajuste APP_DIR)" >&2
  exit 1
fi

CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')"

if [ -z "${CRON_SECRET}" ]; then
  echo "$(date -Is) ERRO: CRON_SECRET não encontrado em ${ENV_FILE}" >&2
  exit 1
fi

echo "$(date -Is) disparando geração de cobranças..."
curl -fsS -X POST "${URL}" -H "Authorization: Bearer ${CRON_SECRET}"
echo ""
