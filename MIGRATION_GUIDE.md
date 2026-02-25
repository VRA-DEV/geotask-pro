# Guia de Migração: GeoTask Pro para Vercel + Supabase

Este documento fornece um passo a passo detalhado para implantar o sistema GeoTask Pro em um ambiente de produção utilizando **Vercel** para o frontend e **Supabase** para o banco de dados PostgreSQL.

---

## 1. Configuração do Banco de Dados (Supabase)

1.  **Criar Conta e Projeto:**
    - Acesse [supabase.com](https://supabase.com/) e crie uma conta.
    - Crie um novo projeto (ex: `geotask-prod`). Anote a senha do banco de dados que você definir.

2.  **Obter a URL de Conexão:**
    - No painel do Supabase, vá em **Project Settings > Database**.
    - Localize a seção **Connection String**.
    - Certifique-se de usar o modo **Transaction** (porta 6543) caso use o Prisma com muitas conexões simultâneas, ou o modo **Session** (porta 5432).
    - A URL será parecida com:
      `postgres://postgres.[SEU_ID]:[SUA_SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true`

3.  **Configurar Chaves de API:**
    - Vá em **Project Settings > API**.
    - Anote a `anon` (public) key e a `service_role` (secret) key se necessário.

---

## 2. Preparação do Código Local

1.  **Ajustar Schema do Prisma:**
    - Verifique seu arquivo `prisma/schema.prisma`. O provider deve ser `postgresql`.
    - Certifique-se de que a variável de ambiente no schema está como `url = env("DATABASE_URL")`.

2.  **Testar Conexão Local:**
    - No seu arquivo `.env` local (temporariamente), atualize a `DATABASE_URL` para a URL do Supabase.
    - Rode: `npx prisma migrate deploy` para criar as tabelas no Supabase.

3.  **Popular Banco Inicial (Opcional):**
    - Rode: `npx prisma db seed` para inserir os dados iniciais (usuários admin, setores, etc.).

---

## 3. Repositório de Código

1.  **Git:**
    - Certifique-se de que seu código está em um repositório privado no **GitHub**, **GitLab** ou **Bitbucket**.
    - **IMPORTANTE:** Nunca suba o arquivo `.env` para o repositório. O `.gitignore` deve incluir `.env`.

---

## 4. Implantação no Frontend (Vercel)

1.  **Importar Projeto:**
    - Acesse [vercel.com](https://vercel.com/) e clique em **Add New > Project**.
    - Conecte sua conta do GitHub e selecione o repositório do GeoTask Pro.

2.  **Configurar Variáveis de Ambiente:**
    - Durante a configuração, procure a seção **Environment Variables**.
    - Adicione as seguintes chaves:
      - `DATABASE_URL`: A string de conexão completa do Supabase.
      - `NEXTAUTH_SECRET`: Gire uma chave aleatória. Você pode gerar uma no terminal com `openssl rand -base64 32`.
      - `NEXTAUTH_URL`: A URL final do seu site na Vercel (ex: `https://geotask-pro.vercel.app`).
      - `NEXT_PUBLIC_SUPABASE_URL`: Sua URL de API do Supabase.
      - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.

3.  **Configuração de Build:**
    - Framework Preset: `Next.js`.
    - Build Command: `next build` (ou `npm run build`).
    - Install Command: `npm install`.

4.  **Deploy:**
    - Clique em **Deploy**. A Vercel iniciará o processo de build e otimização.

---

## 5. Manutenção e Atualizações

- **Novas Migrações:** Sempre que alterar o banco de dados localmente (`npx prisma migrate dev`), você precisará garantir que o comando `npx prisma migrate deploy` seja executado no ambiente de produção.
- **Custom Domain:** Na Vercel, você pode adicionar um domínio personalizado em **Settings > Domains**.
- **Backups:** O Supabase realiza backups diários automáticos, mas verifique o plano escolhido para garantir a retenção necessária.

---

## Checklist de Segurança Final

- [ ] O arquivo `.env` está no `.gitignore`.
- [ ] O usuário Admin inicial teve sua senha alterada após o primeiro login.
- [ ] O `NEXTAUTH_SECRET` é complexo e privado.
- [ ] As regras de segurança (RLS) do Supabase estão configuradas se você estiver acessando o banco diretamente pelo frontend via cliente Supabase (opcional, já que o Prisma roda no servidor).

---

_Documento gerado para a equipe técnica da Geogis._
