# Ligar a autenticação: passo a passo no Supabase

O backend já está pronto e no ar. Falta a configuração no console, que só você
pode fazer. Ordem sugerida: **Google e e-mail/senha primeiro** (cobrem quase
todo mundo no Brasil e ficam prontos hoje), Apple e Facebook depois, porque
dependem de burocracia externa.

---

## 1. Pegar os dados do projeto (2 minutos)

Supabase → seu projeto → **Settings → API**. Anote:

| O que | Onde vai |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `SUPABASE_URL` no Render **e** `EXPO_PUBLIC_SUPABASE_URL` no app |
| **anon public key** | `EXPO_PUBLIC_SUPABASE_ANON_KEY` no app |

A chave `anon` é pública por natureza: ela vai dentro do app e qualquer pessoa
consegue extrair. Quem protege os dados é o RLS do Supabase, não o sigilo dela.

**Nunca** coloque a `service_role` no app. Essa ignora todas as regras.

O backend não precisa de chave nenhuma: ele valida o token pela chave pública
publicada em `/auth/v1/.well-known/jwks.json`. Só precisa do `SUPABASE_URL`.

---

## 2. E-mail e senha (5 minutos)

**Authentication → Providers → Email**: já vem ligado.

Vale ajustar duas coisas:

- **Confirm email**: ligado. Sem confirmação, qualquer pessoa cria conta com o
  e-mail de outra.
- **Authentication → URL Configuration → Site URL**: a URL do webapp
  (`https://fabulous-gumption-4a23a7.netlify.app` hoje, o domínio próprio
  depois). É para onde o link de confirmação e o de recuperação de senha
  devolvem a pessoa. Errar aqui manda todo mundo para uma página em branco.

---

## 3. Google (10 minutos)

1. **Google Cloud Console** → criar projeto (ou usar um existente).
2. **APIs e serviços → Tela de permissão OAuth**: tipo *Externo*, nome do app
   "Grão", e-mail de suporte, e o logo se quiser.
3. **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo
   *Aplicativo da Web*.
4. Em **URIs de redirecionamento autorizados**, cole exatamente:
   ```
   https://SEU-PROJETO.supabase.co/auth/v1/callback
   ```
   Esse endereço aparece pronto no próprio Supabase, em Authentication →
   Providers → Google. Copie de lá para não errar.
5. Copie **Client ID** e **Client Secret** e cole no Supabase, em
   Authentication → Providers → **Google** → Enable.

O erro mais comum aqui é `redirect_uri_mismatch`: significa que a URI colada no
Google não é idêntica à do Supabase. É comparação byte a byte, sem barra
sobrando.

---

## 4. Apple (deixe para quando houver build iOS)

Duas coisas a saber antes de começar:

- exige **Apple Developer Program**, US$ 99 por ano;
- se o app oferece Google ou Facebook na App Store, a Apple **obriga** a
  oferecer Sign in with Apple. Não é opcional.

Por isso não vale fazer agora: só passa a importar quando o app for para a
App Store, e até lá a configuração pode mudar.

Quando chegar a hora: Apple Developer → Certificates, Identifiers & Profiles →
criar um **Services ID**, ligar *Sign in with Apple*, apontar o mesmo
`callback` do Supabase, e gerar uma **chave privada .p8**. Os quatro campos que
o Supabase pede (Services ID, Team ID, Key ID e a chave) saem daí.

---

## 5. Facebook (por último)

Funciona, mas exige **verificação de negócio** para sair do modo de
desenvolvimento, e isso leva dias e pede documento da empresa.

Meta for Developers → criar app tipo *Consumidor* → adicionar **Login do
Facebook** → em *Valid OAuth Redirect URIs*, o mesmo `callback` do Supabase →
copiar App ID e App Secret para o Supabase.

Vale conferir se o público brasileiro realmente usa: Google e e-mail cobrem a
maior parte, e cada botão a mais na tela de login é uma decisão a mais para
alguém de 55 anos tomar.

---

## 6. Biometria e 2FA: já estão preparados

Nenhum dos dois exige mudança no backend. É consequência de ter escolhido o
Supabase Auth.

**Biometria** é do aparelho, não do servidor. Com `expo-local-authentication`,
o app pede digital ou Face ID para destravar a sessão que já está guardada
localmente. O servidor nem fica sabendo. Quando quiser, é uma tela.

**2FA** é recurso do próprio Supabase (`auth.mfa`, TOTP: Google Authenticator,
Authy). Liga em Authentication → Providers → MFA. Quando ligado, o token que
chega no nosso backend já vem com o segundo fator cumprido, e nenhuma linha do
`auth.ts` muda.

Recomendação de produto: **2FA opcional, nunca obrigatório**. Um devocional
diário com dois fatores obrigatórios perde mais gente na porta do que ganha em
segurança. Faz sentido oferecer para quem quiser.

---

## 7. Variáveis a cadastrar

**No Render** (backend):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |

**No app** (`.env` da raiz, e no build):

| Variável | Valor |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | o mesmo Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | a chave `anon public` |

---

## 8. Como o app usa

Depois do login pelo SDK do Supabase, o app chama uma vez:

```
POST /auth/vincular
Authorization: Bearer <access_token do Supabase>
{ "userId": "<o id que o app já guardava>" }

→ { "ok": true, "userId": "<o id que passa a valer>", "merged": true|false }
```

**Se `userId` voltar diferente do que foi enviado, o app precisa gravar o
novo.** Isso acontece quando a pessoa já tinha conta em outro aparelho: os dois
cadastros são fundidos, o da conta vence, e continuar usando o id antigo faria
o app consultar um cadastro que acabou de ser apagado.

Também existe `GET /auth/eu` com o mesmo header, para conferir a sessão.
