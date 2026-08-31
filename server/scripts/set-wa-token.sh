#!/usr/bin/env bash
# Gera o segredo compartilhado entre o backend e o n8n, grava em server/.env e
# deixa na área de transferência para colar no Render e no n8n.
#
# O valor nunca é exibido na tela nem entra no histórico do shell.
#
# Uso: bash scripts/set-wa-token.sh

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "✗ server/.env não existe."; exit 1; }

# 32 bytes de entropia, em hex (64 caracteres). Sem caracteres especiais, para
# atravessar painel web, header HTTP e variável de ambiente sem escape.
TOKEN="$(openssl rand -hex 32)"

python3 - "$TOKEN" <<'PY'
import sys
token = sys.argv[1]
caminho = '.env'
linhas = open(caminho, encoding='utf-8').read().split('\n')
saida, trocou = [], False
for l in linhas:
    if l.startswith('WHATSAPP_TOKEN=') and not trocou:
        saida.append('WHATSAPP_TOKEN=' + token); trocou = True
    else:
        saida.append(l)
if not trocou:
    saida.append('WHATSAPP_TOKEN=' + token)
open(caminho, 'w', encoding='utf-8').write('\n'.join(saida))

import subprocess
subprocess.run(['pbcopy'], input=token.encode('utf-8'), check=True)
PY

echo "✓ Token gerado (64 caracteres) e gravado em server/.env"
echo "✓ Copiado para a área de transferência."
echo
echo "Cole o MESMO valor em dois lugares:"
echo "  1. Render → Environment → WHATSAPP_TOKEN"
echo "  2. n8n → Variables → GRAO_TOKEN"
echo
echo "Depois, esvazie a área de transferência:  pbcopy < /dev/null"
