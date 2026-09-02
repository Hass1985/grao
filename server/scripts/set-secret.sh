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
