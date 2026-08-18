<p align="center">
  <img src="docs/capa.png" alt="Fechô — Pare de cobrar seu grupo no WhatsApp" width="860">
</p>

# Fechô

**Pare de cobrar seu grupo no WhatsApp.**

O Fechô organiza pagamentos, pendências e comprovantes de grupos pequenos e
recorrentes num único painel: pelada semanal, churrasco, vaquinha, mensalidade
de turma, grupo de igreja, condomínio pequeno.

O organizador cria o grupo, cadastra os membros, e o sistema gera as cobranças
recorrentes sozinho. O participante abre um link pessoal, vê quanto deve, copia
a chave Pix e envia o comprovante. O organizador aprova ou recusa. O painel
mostra quem pagou, quem está pendente e quanto entrou.

> **Status:** MVP funcional, rodado em produção, mas **sem manutenção ativa**.
> O código está aqui pra quem quiser estudar, adaptar ou hospedar a própria
> instância. Não há garantia de suporte nem de releases.

## O que ele faz

- **Grupos** com valor padrão, chave Pix e frequência (única, semanal, mensal)
- **Cobranças recorrentes automáticas** — um cron diário gera as cobranças do
  dia (semanal por dia da semana, mensal por dia do mês) — mais cobrança avulsa
  pra rodadas extras
- **Link pessoal por membro** (`/g/[slug]?m=[token]`) enviado pelo WhatsApp
- **Comprovante** enviado pelo participante e guardado em storage privado
- **Aprovação/recusa** pelo organizador, com trilha de auditoria (quem aprovou,
  quando, motivo da recusa)
- **Mensagem de cobrança pronta** via link `wa.me` (sem WhatsApp API)
- **Painel financeiro** por grupo: total pago, pendente, inadimplentes
- **Login** por e-mail/senha, Google ou magic link
- **Plano FREE/PRO** opcional, com assinatura recorrente pelo Mercado Pago

### Decisões de privacidade que valem conhecer

- **A página pública não lista membros e não tem busca.** O acesso do
  participante é só pelo token único do link. Sem o token, a página mostra
  apenas os dados do grupo. Busca por nome permitiria enumerar quem está no
  grupo — o que é um vazamento, não uma conveniência.
- **Comprovantes nunca ficam com URL pública.** O arquivo vive num bucket
  privado e é servido por stream pela própria aplicação, com validação de dono
  a cada acesso.
- **Telefones são normalizados em E.164** e usados só pra montar o link do
  WhatsApp.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** + shadcn/ui
- **PostgreSQL 16** + **Prisma 7**
- **Auth.js v5** (next-auth beta) — sessão em JWT, senha com bcrypt
- **MinIO** (S3-compatível) pra comprovantes
- **Resend** pro magic link
- **Mercado Pago** (opcional) pra assinatura PRO
- **Umami** (opcional) pra analytics cookieless

## Rodando localmente

**Pré-requisitos:** Node.js 20+, Docker e Docker Compose.

```bash
# 1. Dependências
npm install

# 2. Postgres + MinIO locais
docker compose up -d

# 3. Variáveis de ambiente
cp .env.local.example .env.local
#    No mínimo, gere o AUTH_SECRET:
#    openssl rand -base64 32
#    Os valores de banco e MinIO já batem com o docker-compose.yml.

# 4. Banco
npx prisma migrate dev

# 5. Subir
npm run dev
```

Abra http://localhost:3000 e crie uma conta em `/cadastro`.

O bucket do MinIO (`proofs`) é criado automaticamente no primeiro upload — não
precisa mexer no console.

### O que funciona sem configurar nada além do básico

Login por **e-mail e senha**, grupos, membros, cobranças, comprovantes e o
painel. Os itens abaixo são opcionais e ficam desligados se as variáveis não
existirem:

| Recurso | Precisa de |
|---|---|
| Entrar com Google | `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` |
| Magic link / recuperação de senha | `AUTH_RESEND_KEY` (+ `AUTH_RESEND_FROM`) |
| Geração automática de cobranças | `CRON_SECRET` + um agendador chamando a rota |
| Assinatura PRO | `MP_ACCESS_TOKEN` + `MP_WEBHOOK_SECRET` |
| Analytics | `UMAMI_SCRIPT_URL` + `UMAMI_WEBSITE_ID` |

### Variáveis de ambiente

Veja `.env.local.example` (desenvolvimento) e `.env.production.example`
(produção) — cada variável está comentada lá. As principais:

| Variável | Pra que serve |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres |
| `AUTH_SECRET` | Assina os JWTs de sessão (`openssl rand -base64 32`) |
| `AUTH_URL` | URL pública da instância; também vira base dos links do WhatsApp |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET_NAME` | Storage dos comprovantes |
| `CRON_SECRET` | Bearer token da rota de geração de cobranças |
| `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` | Assinatura PRO via Mercado Pago |

> **Nunca comite um `.env` real.** O `.gitignore` cobre `.env*`, com exceção
> dos dois `*.example`, que só contêm placeholders.

### Gerando as cobranças recorrentes

A geração roda por uma rota protegida, chamada uma vez por dia:

```bash
curl -X POST http://localhost:3000/api/cron/generate-charges \
  -H "Authorization: Bearer $CRON_SECRET"
```

Sem `CRON_SECRET` configurado a rota recusa tudo (401) — ela é *fail-closed*,
nunca fica aberta por descuido. Em produção, `deploy/cron/` traz o script e o
agendamento prontos.

### Painel admin

Existe um painel em `/admin` com métricas agregadas do produto. O acesso é pelo
campo `role` do usuário, e a promoção é **manual no banco** (de propósito — não
há tela pra virar admin):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'voce@exemplo.com';
```

Quem não é admin recebe 404 na rota, e não um "acesso negado" — a existência do
painel não é revelada.

## Deploy

O caminho documentado é **self-hosted numa VPS Linux** com Docker + Nginx:
veja **[DEPLOY.md](DEPLOY.md)**.

Postgres e MinIO ficam numa rede interna, sem porta publicada; só o Nginx fala
com a internet.

## Estrutura

```
src/
  app/
    (app)/           painel do organizador (autenticado)
    g/[slug]/        página pública do grupo (acesso por token)
    api/             auth, cron de cobranças, webhook do Mercado Pago
  lib/
    auth.ts          Auth.js (Google + Credentials + Resend)
    charges.ts       motor de geração de cobranças recorrentes
    storage.ts       upload/leitura de comprovantes (S3/MinIO)
    mercadopago.ts   client REST + validação HMAC do webhook
prisma/              schema e migrations
deploy/              nginx e cron pra produção
```

## Se você for rodar com dados reais

O banco vai guardar **dados pessoais de terceiros** — nomes, telefones e
comprovantes de pagamento com informação bancária. Isso é dado sensível sob a
LGPD, e a responsabilidade passa a ser de quem hospeda:

- Rode atrás de HTTPS, sempre.
- Não exponha Postgres nem MinIO à internet.
- Trate os backups como material sensível (acesso restrito, cifrado).
- Só colete o que precisa e apague o que não usa mais.

## Licença

[AGPL-3.0](LICENSE). Em resumo: você pode usar, estudar, modificar e
redistribuir. Se rodar uma versão **modificada** como serviço acessível pela
rede, precisa disponibilizar o código-fonte dessa versão aos usuários dela.
