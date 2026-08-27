#!/usr/bin/env bash
# Lê a chave da Anthropic da ÁREA DE TRANSFERÊNCIA e grava em server/.env.
# A chave nunca é exibida na tela nem fica no histórico do shell.
#
# Uso: copie a chave no console.anthropic.com e rode:
#   bash scripts/set-key.sh

set -euo pipefail
cd "$(dirname "$0")/.."

KEY="$(pbpaste | tr -d '[:space:]')"

if [ -z "$KEY" ]; then
  echo "✗ Área de transferência vazia. Copie a chave e rode de novo."; exit 1
fi
case "$KEY" in
  sk-ant-*) ;;
  *) echo "✗ O que está copiado não parece uma chave da Anthropic (deve começar com sk-ant-)."; exit 1 ;;
esac
# remove prefixo duplicado, caso a colagem tenha sobreposto um valor antigo
while case "$KEY" in sk-ant-sk-ant-*) true ;; *) false ;; esac; do
  KEY="${KEY#sk-ant-}"
done
if [ "${#KEY}" -lt 40 ]; then
  echo "✗ Chave curta demais (${#KEY} caracteres) — a cópia pode ter ficado incompleta."; exit 1
fi

[ -f .env ] || cp .env.example .env
# substitui a linha inteira (sem deixar resíduo do valor anterior)
python3 - "$KEY" <<'PY'
import sys
key = sys.argv[1]
path = '.env'
lines = open(path, encoding='utf-8').read().split('\n')
out, done = [], False
for l in lines:
    if l.startswith('ANTHROPIC_API_KEY=') and not done:
        out.append('ANTHROPIC_API_KEY=' + key); done = True
    else:
        out.append(l)
if not done:
    out.append('ANTHROPIC_API_KEY=' + key)
open(path, 'w', encoding='utf-8').write('\n'.join(out))
PY

echo "✓ Chave gravada em server/.env (${#KEY} caracteres, começa com ${KEY:0:14}…)"
echo "  O arquivo .env está no .gitignore — a chave não vai para o repositório."
