# Deploy — Fechô

O Fechô roda **self-hosted numa VPS** (Ubuntu 24.04). Tudo em containers Docker
numa rede interna isolada; o Nginx do host é a única porta pra internet.

> **Por que não Vercel?** Com a VPS própria, hospedar o app junto do banco evita
> expor Postgres/MinIO à internet (segurança) e elimina a latência app↔banco.

## Arquitetura

```
Internet ──443──> Nginx (host, reverse proxy + HTTPS Let's Encrypt)
                    └─> web   (Next.js, container, 127.0.0.1:3000)
                          ├─> postgres  (container, rede interna, SEM porta pública)
                          └─> minio     (container, rede interna, SEM porta pública)
```

- **Postgres e MinIO não publicam portas** — só existem pra os containers.
- **MinIO nunca é exposto:** o comprovante é servido via stream pelo Next
  (`src/lib/storage.ts` → `getProofObject`), não por URL pública.
- App acessível em **https://fechoapp.com.br**.

## Arquivos de deploy (no repo)

| Arquivo | Função |
|---------|--------|
| `Dockerfile` | Build multi-stage do Next (output standalone, usuário sem root) |
| `docker-compose.prod.yml` | postgres + minio + migrate + web |
| `.env.production.example` | Modelo das variáveis de produção |
| `deploy/nginx/nginx.conf` | nginx.conf principal (inclui sites-enabled) |
| `deploy/nginx/fechoapp.conf` | server block do Fechô (proxy + upload) |
| `deploy/cron/generate-charges.sh` | Dispara a geração diária de cobranças |
| `deploy/cron/fecho` | Agendamento (`/etc/cron.d/fecho`, 06:00) |

---

## Atualizar o app (dia a dia)

Depois de fazer `git push` no código, na VPS:

```bash
cd ~/fecho
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

O `up -d --build` rebuilda a imagem, roda as migrations pendentes (serviço
`migrate`) e sobe a nova versão do `web`. O Nginx continua igual.

> Se mudou só infra de Nginx (`deploy/nginx/*`), veja a seção **Nginx** abaixo —
> aí não precisa rebuildar container.

---

## Setup inicial (primeira vez — referência)

Feito em 2026-06-08. Documentado pra reproduzir caso precise migrar de VPS.

### 1. Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
docker --version && docker compose version
```

### 2. Clonar o repo (deploy key SSH, só-leitura)

```bash
ssh-keygen -t ed25519 -C "fecho-vps-deploy" -f ~/.ssh/fecho_deploy -N ""
cat ~/.ssh/fecho_deploy.pub   # cadastrar em GitHub > repo > Settings > Deploy keys (sem write)

printf 'Host github.com\n  IdentityFile ~/.ssh/fecho_deploy\n  IdentitiesOnly yes\n' > ~/.ssh/config
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null

cd ~ && git clone git@github.com:sardxz/fecho.git && cd fecho
```

### 3. Variáveis de produção (`.env`)

```bash
cp .env.production.example .env

# Gera os segredos (senhas de banco/MinIO só com letras+números, pra não quebrar a URL)
PG_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')
MINIO_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')
AUTH_SEC=$(openssl rand -base64 32)
CRON_SEC=$(openssl rand -base64 32)

sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\"$PG_PASS\"|" .env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"postgresql://fecho:$PG_PASS@postgres:5432/fecho\"|" .env
sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$AUTH_SEC\"|" .env
sed -i "s|^CRON_SECRET=.*|CRON_SECRET=\"$CRON_SEC\"|" .env
sed -i "s|^MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=\"$MINIO_PASS\"|" .env
sed -i "s|^S3_SECRET_ACCESS_KEY=.*|S3_SECRET_ACCESS_KEY=\"$MINIO_PASS\"|" .env
chmod 600 .env

# Preencher à mão (do .env.local local): AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY
nano .env
grep -c "TROCAR\|seu-client\|re_sua" .env   # tem que dar 0
```

> **Google OAuth:** cadastre as URLs de produção em
> https://console.cloud.google.com/apis/credentials (origem
> `https://fechoapp.com.br`, redirect `https://fechoapp.com.br/api/auth/callback/google`),
> senão dá `redirect_uri_mismatch`.

### 4. Subir os containers

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -I http://127.0.0.1:3000   # deve dar 200
```

### 5. Nginx (reverse proxy)

```bash
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak   # backup
sudo cp ~/fecho/deploy/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp ~/fecho/deploy/nginx/fechoapp.conf /etc/nginx/sites-enabled/fechoapp.conf
sudo nginx -t && sudo systemctl reload nginx
curl -I http://fechoapp.com.br   # 200 ou 301
```

### 6. HTTPS (Let's Encrypt)

Pré-requisito: DNS do domínio (registro **A** raiz) apontando pro IP da VPS.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fechoapp.com.br -d www.fechoapp.com.br
# escolher "Redirect" quando perguntar sobre HTTP->HTTPS
```

Renovação é automática (certbot agenda). Testar: `sudo certbot renew --dry-run`.

### 7. Cron (geração diária de cobranças)

```bash
sed -i 's/\r$//' ~/fecho/deploy/cron/generate-charges.sh
chmod +x ~/fecho/deploy/cron/generate-charges.sh
~/fecho/deploy/cron/generate-charges.sh           # teste: {"ok":true,...}

sudo cp ~/fecho/deploy/cron/fecho /etc/cron.d/fecho
sudo sed -i 's/\r$//' /etc/cron.d/fecho
sudo chmod 644 /etc/cron.d/fecho
```

---

## Umami (analytics: acessos + geolocalização)

Self-hosted, reusa o Postgres (database `umami`), exposto em
`analytics.fechoapp.com.br`. Cookieless / LGPD-friendly.

```bash
# 1) DNS: criar CNAME  analytics -> fechoapp.com.br  (ou A -> IP da VPS)

# 2) Database do Umami + segredo no .env
cd ~/fecho && git pull
docker compose -f docker-compose.prod.yml exec postgres psql -U fecho -c "CREATE DATABASE umami;"
echo "UMAMI_APP_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# 3) Sobe o Umami + Nginx + SSL
docker compose -f docker-compose.prod.yml up -d
sudo cp ~/fecho/deploy/nginx/analytics.conf /etc/nginx/sites-enabled/analytics.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d analytics.fechoapp.com.br

# 4) Painel: abrir https://analytics.fechoapp.com.br (login admin / umami,
#    TROCAR a senha). Settings > Websites > Add (domínio fechoapp.com.br).
#    Copiar o Website ID.

# 5) Ligar o tracking: preencher UMAMI_WEBSITE_ID no .env e recriar o web
nano .env   # UMAMI_WEBSITE_ID="<id copiado>"
docker compose -f docker-compose.prod.yml up -d web
```

> O script de tracking só é injetado quando `UMAMI_SCRIPT_URL` **e**
> `UMAMI_WEBSITE_ID` estão no `.env` (ver `src/app/layout.tsx`).

## Mercado Pago (assinatura PRO)

A assinatura recorrente roda pelo **preapproval** do Mercado Pago (renovação
automática por cartão). O webhook confirma o pagamento e seta `User.plan = PRO`.

```text
1) Painel MP (https://www.mercadopago.com.br/developers) → criar/abrir o app.

2) Credenciais de PRODUÇÃO → copiar o Access Token (APP_USR-...).
   Preencher no .env da VPS:  MP_ACCESS_TOKEN="APP_USR-..."

3) Webhooks → cadastrar a URL:
      https://fechoapp.com.br/api/webhooks/mercadopago
   Marcar o evento "Assinaturas" (preapproval). Copiar a "Assinatura secreta".
   Preencher no .env:  MP_WEBHOOK_SECRET="<assinatura secreta>"

4) Recriar o app pra carregar as envs:
      docker compose -f docker-compose.prod.yml up -d web
```

> **Segurança:** o webhook é *fail-closed* — sem `MP_WEBHOOK_SECRET` ele recusa
> toda notificação (401). E nunca confia no corpo recebido: valida a assinatura
> HMAC e depois consulta o MP pelo id pra ler o status real antes de virar PRO.

## Operação

```bash
# Status dos containers
docker compose -f docker-compose.prod.yml ps

# Logs (web = app Next)
docker compose -f docker-compose.prod.yml logs -f web

# Reiniciar só o app
docker compose -f docker-compose.prod.yml restart web

# Parar / subir tudo
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Rodar migration manualmente (se precisar)
docker compose -f docker-compose.prod.yml run --rm migrate

# Log do cron
cat /var/log/fecho-cron.log
```

## Troubleshooting

- **`nginx -t` falha com certificado faltando:** algum server block aponta pra
  um cert removido. `grep -rl <dominio> /etc/nginx/` pra achar e ajustar.
- **App não responde pelo domínio mas `curl 127.0.0.1:3000` dá 200:** problema é
  no Nginx (config ou reload). Veja `sudo systemctl status nginx`.
- **`bad interpreter: ^M` num script:** veio com CRLF do Windows. Rode
  `sed -i 's/\r$//' <arquivo>`. O `.gitattributes` já força LF nos `.sh`.
- **Login Google dá `redirect_uri_mismatch`:** falta cadastrar a URL de
  produção no Google Cloud (ver passo 3).

## Backups (recomendado configurar)

Os dados vivem em volumes Docker (`postgres_data`, `minio_data`). Vale agendar
um dump periódico:

```bash
# Dump do Postgres
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U fecho fecho > ~/backup-fecho-$(date +%F).sql
```
