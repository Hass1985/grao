#!/usr/bin/env bash
# Configura o Supabase Auth nos dois lados e CONFERE se ficou de pé.
#
# São dois arquivos diferentes, e essa é a parte que se erra editando à mão:
#   server/.env  SUPABASE_URL                      (o backend valida o token)
#   .env         EXPO_PUBLIC_SUPABASE_URL          (o app faz o login)
#                EXPO_PUBLIC_SUPABASE_ANON_KEY
#
# A URL do projeto não é segredo e vem como argumento. A chave pública TAMBÉM
# não é (ela vai dentro do app, e qualquer pessoa extrai do bundle), mas é
# longa demais para digitar, então vem da área de transferência. Quem protege
# os dados é o RLS do Supabase, não o sigilo dela.
#
# A chave SECRETA nunca entra aqui: ela ignora todas as regras de acesso.
#
# Dois formatos convivem hoje. O Supabase está aposentando `anon` (um JWT que
# começa com eyJ) em favor de `sb_publishable_...`, e o mesmo vale do lado
# secreto: `service_role` virou `sb_secret_...`. O script aceita os dois
# públicos e recusa os dois secretos, porque durante a transição é fácil pegar
# o par errado sem perceber.
#
# Uso:
#   1. copie a chave pública (Supabase → Settings → API Keys)
#   2. bash scripts/configurar-supabase.sh https://SEU-PROJETO.supabase.co

set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$(cd .. && pwd)"

# Sem argumento, aproveita a URL que já está no .env. Uma coisa a menos para
# digitar errado, e o normal é ela já estar lá.
URL="${1:-$(grep -E "^SUPABASE_URL=" .env 2>/dev/null | cut -d= -f2- || true)}"
if [ -z "$URL" ]; then
  echo "✗ Faltou a URL do projeto."
  echo "  Uso: bash scripts/configurar-supabase.sh https://SEU-PROJETO.supabase.co"
  exit 1
fi
URL="${URL%/}"
case "$URL" in
  https://*.supabase.co) ;;
  *) echo "✗ URL estranha: $URL"
     echo "  Esperado algo como https://abcdefgh.supabase.co"; exit 1 ;;
esac

CHAVE="$(pbpaste | tr -d '\r\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
if [ -z "$CHAVE" ]; then
  echo "✗ Área de transferência vazia. Copie a chave 'anon public' e rode de novo."
  exit 1
fi
# As duas formas de chave secreta, barradas antes de qualquer coisa: colocar
# uma delas dentro do app daria acesso total a quem baixasse o bundle.
case "$CHAVE" in
  sb_secret_*)
    echo "✗ Isso é a chave SECRETA (sb_secret_…), não a pública."
    echo "  Ela ignora todas as regras de acesso e NUNCA pode ir para dentro do app."
    exit 1 ;;
esac
if printf '%s' "$CHAVE" | grep -q 'service_role'; then
  echo "✗ Isso é a chave SERVICE_ROLE, não a pública."
  echo "  Ela ignora todas as regras de acesso e NUNCA pode ir para dentro do app."
  exit 1
fi

# Formato: o novo (sb_publishable_) ou o antigo (JWT começando com eyJ).
case "$CHAVE" in
  sb_publishable_*) FORMATO="publishable (novo)" ;;
  eyJ*)             FORMATO="anon (formato antigo, ainda aceito)" ;;
  *)
    echo "✗ Isso não parece uma chave pública do Supabase."
    echo "  Esperado começar com 'sb_publishable_' ou com 'eyJ'."
    echo "  Ela está em Settings → API Keys."
    exit 1 ;;
esac
if [ "${#CHAVE}" -lt 30 ]; then
  echo "✗ A chave tem só ${#CHAVE} caracteres. Copiou inteira?"
  exit 1
fi
echo "Chave reconhecida: $FORMATO"
echo

grava() {  # arquivo, nome, valor
  local arq="$1" nome="$2" valor="$3"
  [ -f "$arq" ] || touch "$arq"
  # Garante a quebra de linha no fim ANTES de acrescentar. Sem isto, a
  # variável nova gruda no valor da última linha e as duas se perdem juntas:
  # aconteceu de verdade aqui, e o ASAAS_API_KEY virou lixo com um
  # SUPABASE_URL colado no fim.
  [ -s "$arq" ] && [ "$(tail -c1 "$arq" | wc -l)" -eq 0 ] && printf '\n' >> "$arq"
  if grep -q "^${nome}=" "$arq"; then
    # -i '' é a forma do sed no macOS; no Linux seria -i puro.
    sed -i '' -E "s|^${nome}=.*|${nome}=${valor}|" "$arq"
    echo "  ~ $nome atualizado em ${arq/#$RAIZ\//}"
  else
    printf '%s=%s\n' "$nome" "$valor" >> "$arq"
    echo "  + $nome gravado em ${arq/#$RAIZ\//}"
  fi
}

echo "Gravando…"
grava ".env" "SUPABASE_URL" "$URL"
grava "$RAIZ/.env" "EXPO_PUBLIC_SUPABASE_URL" "$URL"
grava "$RAIZ/.env" "EXPO_PUBLIC_SUPABASE_ANON_KEY" "$CHAVE"

echo
echo "Conferindo o projeto…"

# 1. O projeto responde?
COD=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
  -H "apikey: $CHAVE" "$URL/auth/v1/settings" || echo 000)
if [ "$COD" = "200" ]; then
  echo "  ✓ projeto responde e a chave anon é válida"
else
  echo "  ✗ o projeto não respondeu como esperado (HTTP $COD)"
  echo "    Confira a URL e se a chave é a 'anon public'."
  exit 1
fi

# 2. Quais provedores estão ligados? É o que mais gera dúvida no console.
echo
echo "Provedores ligados neste projeto:"
curl -s --max-time 10 -H "apikey: $CHAVE" "$URL/auth/v1/settings" \
  | python3 -c '
import json, sys
d = json.load(sys.stdin)
ext = d.get("external", {})
nomes = {"google":"Google","apple":"Apple","facebook":"Facebook","email":"E-mail e senha","phone":"Telefone (SMS)"}
for chave, rotulo in nomes.items():
    print(f"  {\"✓\" if ext.get(chave) else \" \"} {rotulo}")
if d.get("mfa_enabled"): print("  ✓ 2FA (MFA) disponível")
'

# 3. Assinatura assimétrica: é o caminho que o backend prefere.
echo
JWKS=$(curl -s --max-time 10 "$URL/auth/v1/.well-known/jwks.json" || echo '{}')
N=$(printf '%s' "$JWKS" | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("keys",[])))' 2>/dev/null || echo 0)
if [ "$N" -gt 0 ]; then
  echo "✓ chaves assimétricas publicadas ($N). O backend valida sem segredo compartilhado."
else
  echo "⚠ o projeto ainda usa o segredo HS256 compartilhado."
  echo "  Funciona, mas o Supabase desaconselha: o mesmo segredo assina e verifica."
  echo "  Para migrar: Settings → JWT Keys → migrar para chave assimétrica."
  echo "  Enquanto não migrar, rode: bash scripts/set-secret.sh SUPABASE_JWT_SECRET"
fi

echo
echo "Falta cadastrar no Render (Environment):"
echo "  SUPABASE_URL = $URL"
