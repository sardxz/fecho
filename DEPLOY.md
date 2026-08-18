# Deploy — Fechô (self-hosted)

O Fechô foi feito pra rodar **self-hosted numa VPS Linux** (testado em Ubuntu
24.04). Tudo em containers Docker numa rede interna isolada; o Nginx do host é
a única porta pra internet.

> **Por que não serverless?** Com a VPS própria, o app roda junto do banco: não
> é preciso expor Postgres/MinIO à internet (segurança) e a latência app↔banco
> some. Se preferir hospedar o Next em outro lugar, você vai precisar expor o
> Postgres e o MinIO com TLS e firewall — não é o caminho documentado aqui.

Ao longo deste guia, troque `SEU-DOMINIO.com.br` pelo seu domínio e `/opt/fecho`
pelo diretório onde você clonou o repo.

## Arquitetura

```
Internet ──443──> Nginx (host, reverse proxy + HTTPS Let's Encrypt)
                    └─> web   (Next.js, container, 127.0.0.1:3000)
                          ├─> postgres  (container, rede interna, SEM porta pública)
                          └─> minio     (container, rede interna, SEM porta pública)
```

- **Postgres e MinIO não publicam portas** — só existem pra os containers.
- **MinIO nunca é exposto:** o comprovante é servido por stream pelo Next
  (`src/lib/storage.ts` → `getProofObject`), não por URL pública.

## Arquivos de deploy (no repo)

| Arquivo | Função |
|---------|--------|
| `Dockerfile` | Build multi-stage do Next (output standalone, usuário sem root) |
| `docker-compose.prod.yml` | postgres + minio + migrate + web (+ umami opcional) |
| `.env.production.example` | Modelo das variáveis de produção |
| `deploy/nginx/nginx.conf` | nginx.conf principal (inclui sites-enabled) |
| `deploy/nginx/app.conf` | server block do app (proxy + limite de upload) |
| `deploy/nginx/analytics.conf` | server block do Umami (opcional) |
| `deploy/cron/generate-charges.sh` | Dispara a geração diária de cobranças |
| `deploy/cron/fecho` | Agendamento (`/etc/cron.d/fecho`, 06:00) |

---

## Setup inicial

### 0. Usuário de serviço (recomendado)

Não rode a aplicação como `root`. Crie um usuário dedicado, dono do diretório
do projeto e membro do grupo `docker`:

```bash
sudo adduser --system --group --home /opt/fecho fecho
sudo usermod -aG docker fecho
```

### 1. Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
docker --version && docker compose version
```

### 2. Clonar o repo

Em produção, use uma **deploy key SSH só-leitura** em vez das suas credenciais
pessoais do Git:

```bash
ssh-keygen -t ed25519 -C "fecho-vps-deploy" -f ~/.ssh/fecho_deploy -N ""
cat ~/.ssh/fecho_deploy.pub   # cadastrar em GitHub > repo > Settings > Deploy keys (sem write)

printf 'Host github.com\n  IdentityFile ~/.ssh/fecho_deploy\n  IdentitiesOnly yes\n' > ~/.ssh/config
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null

git clone git@github.com:SEU-USUARIO/fecho.git /opt/fecho && cd /opt/fecho
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

# Preencher à mão: AUTH_URL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY
nano .env
grep -c "TROCAR\|seu-client\|re_sua\|SEU-DOMINIO" .env   # tem que dar 0
```

> **O `.env` nunca vai pro Git.** O `.gitignore` já cobre, mas confira antes de
> qualquer commit feito na própria VPS.

> **Google OAuth:** cadastre as URLs de produção em
> https://console.cloud.google.com/apis/credentials (origem
> `https://SEU-DOMINIO.com.br`, redirect
> `https://SEU-DOMINIO.com.br/api/auth/callback/google`), senão dá
> `redirect_uri_mismatch`.

### 4. Subir os containers

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -I http://127.0.0.1:3000   # deve dar 200
```

### 5. Nginx (reverse proxy)

Edite `deploy/nginx/app.conf` e troque `SEU-DOMINIO.com.br` antes de copiar.

```bash
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak   # backup
sudo cp deploy/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp deploy/nginx/app.conf /etc/nginx/sites-enabled/fecho.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 6. HTTPS (Let's Encrypt)

Pré-requisito: DNS do domínio (registro **A** na raiz) apontando pro IP da VPS.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU-DOMINIO.com.br -d www.SEU-DOMINIO.com.br
# escolher "Redirect" quando perguntar sobre HTTP->HTTPS
```

Renovação é automática (certbot agenda). Testar: `sudo certbot renew --dry-run`.

### 7. Firewall

Só 80/443 (e o SSH) devem ficar abertos:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 8. Cron (geração diária de cobranças)

Edite `deploy/cron/fecho` (usuário, `APP_DIR`, `APP_URL`) antes de instalar.

```bash
chmod +x deploy/cron/generate-charges.sh
APP_DIR=/opt/fecho APP_URL=https://SEU-DOMINIO.com.br \
  ./deploy/cron/generate-charges.sh          # teste: {"ok":true,...}

sudo cp deploy/cron/fecho /etc/cron.d/fecho
sudo chmod 644 /etc/cron.d/fecho
```

---

## Atualizar o app (dia a dia)

```bash
cd /opt/fecho
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

O `up -d --build` rebuilda a imagem, roda as migrations pendentes (serviço
`migrate`) e sobe a nova versão do `web`. O Nginx continua igual.

> Se mudou só a config do Nginx (`deploy/nginx/*`), basta copiar e recarregar —
> não precisa rebuildar container.

---

## Umami (analytics — opcional)

Self-hosted, reusa o Postgres (database `umami`), servido em
`analytics.SEU-DOMINIO.com.br`. Cookieless / LGPD-friendly.

```bash
# 1) DNS: criar CNAME  analytics -> SEU-DOMINIO.com.br  (ou A -> IP da VPS)

# 2) Database do Umami + segredo no .env
cd /opt/fecho
docker compose -f docker-compose.prod.yml exec postgres psql -U fecho -c "CREATE DATABASE umami;"
echo "UMAMI_APP_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# 3) Sobe o Umami + Nginx + SSL
docker compose -f docker-compose.prod.yml up -d
sudo cp deploy/nginx/analytics.conf /etc/nginx/sites-enabled/analytics.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d analytics.SEU-DOMINIO.com.br

# 4) Painel: abrir https://analytics.SEU-DOMINIO.com.br
#    ATENÇÃO: o Umami sobe com credenciais padrão públicas — TROQUE a senha no
#    primeiro acesso, antes de qualquer outra coisa.
#    Depois: Settings > Websites > Add e copie o Website ID.

# 5) Ligar o tracking: preencher UMAMI_WEBSITE_ID no .env e recriar o web
nano .env   # UMAMI_WEBSITE_ID="<id copiado>"
docker compose -f docker-compose.prod.yml up -d web
```

> O script de tracking só é injetado quando `UMAMI_SCRIPT_URL` **e**
> `UMAMI_WEBSITE_ID` estão no `.env` (ver `src/app/layout.tsx`).

## Mercado Pago (assinatura PRO — opcional)

A assinatura recorrente roda pelo **preapproval** do Mercado Pago (renovação
automática por cartão). O webhook confirma o pagamento e seta `User.plan = PRO`.
Sem `MP_ACCESS_TOKEN`, o app funciona normalmente — só não tem checkout de PRO.

```text
1) Painel MP (https://www.mercadopago.com.br/developers) → criar/abrir o app.

2) Credenciais de PRODUÇÃO → copiar o Access Token (APP_USR-...).
   Preencher no .env:  MP_ACCESS_TOKEN="APP_USR-..."

3) Webhooks → cadastrar a URL:
      https://SEU-DOMINIO.com.br/api/webhooks/mercadopago
   Marcar o evento "Assinaturas" (preapproval). Copiar a "Assinatura secreta".
   Preencher no .env:  MP_WEBHOOK_SECRET="<assinatura secreta>"

4) Recriar o app pra carregar as envs:
      docker compose -f docker-compose.prod.yml up -d web
```

> **Segurança:** o webhook é *fail-closed* — sem `MP_WEBHOOK_SECRET` ele recusa
> toda notificação (401). E nunca confia no corpo recebido: valida a assinatura
> HMAC e depois consulta o MP pelo id pra ler o status real antes de virar PRO.

> **Teste ponta-a-ponta:** o Mercado Pago bloqueia pagar a si mesmo. Pra validar
> a compra de verdade, use uma conta pagadora diferente da conta coletora.

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

## Backups

Os dados vivem em volumes Docker (`postgres_data`, `minio_data`). O banco guarda
dados pessoais de terceiros (nomes, telefones, comprovantes) — trate os dumps
como material sensível: permissão restrita, armazenamento cifrado e retenção
definida.

```bash
# Dump do Postgres
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U fecho fecho > ~/backup-fecho-$(date +%F).sql
chmod 600 ~/backup-fecho-$(date +%F).sql
```

## Troubleshooting

- **`nginx -t` falha com certificado faltando:** algum server block aponta pra
  um cert removido. `grep -rl <dominio> /etc/nginx/` pra achar e ajustar.
- **App não responde pelo domínio mas `curl 127.0.0.1:3000` dá 200:** problema é
  no Nginx (config ou reload). Veja `sudo systemctl status nginx`.
- **`bad interpreter: ^M` num script:** o arquivo veio com CRLF do Windows. Rode
  `sed -i 's/\r$//' <arquivo>`. O `.gitattributes` já força LF nos `.sh`.
- **Login Google dá `redirect_uri_mismatch`:** falta cadastrar a URL de
  produção no Google Cloud (ver passo 3).
