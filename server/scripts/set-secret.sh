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
