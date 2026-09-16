#!/usr/bin/env bash
# Grava um segredo em server/.env lendo da ÁREA DE TRANSFERÊNCIA.
# O valor nunca aparece na tela nem no histórico do shell.
#
# Uso: copie o valor e rode com o nome da variável:
#   bash scripts/set-secret.sh WA_ACCESS_TOKEN
#   bash scripts/set-secret.sh WA_APP_SECRET
#
# Para valores que NÃO são segredo (IDs), pode editar o .env à mão.

set -euo pipefail
cd "$(dirname "$0")/.."

NOME="${1:-}"
if [ -z "$NOME" ]; then
  echo "✗ Faltou o nome da variável. Ex.: bash scripts/set-secret.sh WA_ACCESS_TOKEN"; exit 1
fi
case "$NOME" in
  [A-Z_][A-Z0-9_]*) ;;
  *) echo "✗ Nome inválido: use MAIÚSCULAS_COM_UNDERSCORE."; exit 1 ;;
esac
[ -f .env ] || { echo "✗ server/.env não existe."; exit 1; }

VALOR="$(pbpaste | tr -d '\r\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
if [ -z "$VALOR" ]; then
  echo "✗ Área de transferência vazia. Copie o valor e rode de novo."; exit 1
fi

# Nenhuma chave de API tem espaço. Esta linha sozinha teria evitado o dia em
# que a área de transferência tinha o texto das telas do onboarding e ele foi
# gravado como ASAAS_API_KEY, com 499 caracteres e um 401 do Asaas como única
# pista.
case "$VALOR" in
  *\ *)
    echo "✗ O valor colado tem ESPAÇOS, então não é uma chave."
    echo "  Começa com: $(printf '%s' "$VALOR" | cut -c1-40)…"
    echo "  Copie o valor certo e rode de novo, sem copiar mais nada no meio."
    exit 1 ;;
esac

# Curto demais para ser chave. Nenhum serviço emite credencial com menos de 20
# caracteres — mas nomes, ids e rótulos cabem folgados aí. Foi assim que
# "semente_do_dia_v3", que estava na área de transferência de configurar o
# Render, virou STT_API_KEY: 17 caracteres, sem espaço, passou pela checagem
# anterior e ficou gravado como se fosse a chave.
if [ "${#VALOR}" -lt 20 ]; then
  echo "✗ O valor colado tem só ${#VALOR} caracteres — curto demais para ser uma chave."
  echo "  Termina em: …$(printf '%s' "$VALOR" | tail -c 6)"
  echo "  Confira se a área de transferência não ficou com outra coisa."
  exit 1
fi

# Já é o valor de OUTRA variável? Então a área de transferência não mudou desde
# a última vez. O sintoma é o pior de todos: a integração se declara
# configurada e falha em toda chamada.
DUPLICADA="$(awk -F= -v v="$VALOR" -v n="$NOME" '
  index($0,"=")>0 {
    chave=substr($0,1,index($0,"=")-1);
    valor=substr($0,index($0,"=")+1);
    gsub(/^[ \t]+|[ \t\r]+$/,"",valor);
    if (valor==v && chave!=n) print chave;
  }' .env | head -1)"
if [ -n "$DUPLICADA" ]; then
  echo "✗ Esse valor já é o de $DUPLICADA no .env."
  echo "  A área de transferência não mudou desde a última colagem."
  echo "  Copie a chave certa e rode de novo."
  exit 1
fi

# Formato conhecido por variável. Ajuda a pegar a chave certa do serviço errado,
# que é o erro que não dá mensagem nenhuma: só para de funcionar.
case "$NOME" in
  ASAAS_API_KEY)
    case "$VALOR" in
      \$aact_hmlg_*) echo "Chave do Asaas reconhecida: SANDBOX (não cobra de verdade)" ;;
      \$aact_prod_*) echo "⚠ Chave do Asaas de PRODUÇÃO: cobranças serão reais." ;;
      \$aact_*)      echo "Chave do Asaas reconhecida (ambiente indefinido)." ;;
      *)
        echo "✗ Isso não parece uma chave do Asaas."
        echo "  Elas começam com \$aact_hmlg_ (sandbox) ou \$aact_prod_ (produção)."
        echo "  No painel do Asaas: menu do usuário → Integrações → Gerar nova Chave de API."
        exit 1 ;;
    esac ;;
  STT_API_KEY)
    case "$VALOR" in
      sk-*|gsk_*|sk_*) ;;
      *)
        echo "✗ Isso não parece uma chave de transcrição."
        echo "  Groq começa com gsk_ · OpenAI começa com sk-"
        echo "  Termina em: …$(printf '%s' "$VALOR" | tail -c 6)"
        exit 1 ;;
    esac ;;
esac

python3 - "$NOME" "$VALOR" <<'PY'
import sys
nome, valor = sys.argv[1], sys.argv[2]
caminho = '.env'
linhas = open(caminho, encoding='utf-8').read().split('\n')
saida, trocou = [], False
for l in linhas:
    if l.startswith(nome + '=') and not trocou:
        saida.append(f'{nome}={valor}'); trocou = True
    else:
        saida.append(l)
if not trocou:
    saida.append(f'{nome}={valor}')
open(caminho, 'w', encoding='utf-8').write('\n'.join(saida))

# Confirma sem revelar: tamanho e as 4 últimas letras bastam para conferir
# que a colagem veio inteira.
print(f'✓ {nome} gravado ({len(valor)} caracteres, termina em …{valor[-4:]})')
PY

echo "  server/.env está no .gitignore — o valor não vai para o repositório."
echo "  Esvazie a área de transferência quando terminar:  pbcopy < /dev/null"
