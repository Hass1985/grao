#!/usr/bin/env bash
# Troca a SENHA do banco na DATABASE_URL de server/.env, lendo a senha nova da
# ÁREA DE TRANSFERÊNCIA. A senha nunca aparece na tela nem no histórico do shell.
#
# Por que existe: a senha do Supabase tem caracteres especiais (/, @, :, ?, #)
# que QUEBRAM a connection string se coladas cruas — o Postgres lê o "@" como
# início do host. Aqui ela é percent-encoded automaticamente.
#
# Uso: copie a senha nova no painel do Supabase e rode:
#   bash scripts/set-db-password.sh
#
# Ao final, a connection string COMPLETA fica na área de transferência, pronta
# para colar no Render (Environment → DATABASE_URL). Rode `pbcopy < /dev/null`
# depois de colar, para não deixar a senha na área de transferência.

set -euo pipefail
cd "$(dirname "$0")/.."

# Não usa tr -d '[:space:]': a senha pode legitimamente conter espaço.
# Remove apenas quebras de linha e espaços nas pontas.
PASS="$(pbpaste | tr -d '\r\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"

if [ -z "$PASS" ]; then
  echo "✗ Área de transferência vazia. Copie a senha nova e rode de novo."; exit 1
fi
if [ ! -f .env ]; then
  echo "✗ server/.env não existe. Rode 'cp .env.example .env' primeiro."; exit 1
fi

python3 - "$PASS" <<'PY'
import sys, urllib.parse

senha = sys.argv[1]
caminho = '.env'
linhas = open(caminho, encoding='utf-8').read().split('\n')

atual = next((l.split('=', 1)[1].strip() for l in linhas if l.startswith('DATABASE_URL=')), '')
if not atual:
    print('✗ Não achei DATABASE_URL em server/.env.'); sys.exit(1)

u = urllib.parse.urlsplit(atual)
if not u.hostname or not u.username:
    print('✗ DATABASE_URL atual não tem usuário/host — corrija à mão antes.'); sys.exit(1)

# safe='' força o encode de TODOS os reservados, inclusive / @ : ? # & =
codificada = urllib.parse.quote(senha, safe='')
porta = f':{u.port}' if u.port else ''
nova = f'{u.scheme}://{u.username}:{codificada}@{u.hostname}{porta}{u.path}'
if u.query:
    nova += '?' + u.query

saida = []
trocou = False
for l in linhas:
    if l.startswith('DATABASE_URL=') and not trocou:
        saida.append('DATABASE_URL=' + nova); trocou = True
    else:
        saida.append(l)
open(caminho, 'w', encoding='utf-8').write('\n'.join(saida))

mudou = '(precisou de codificação)' if codificada != senha else '(sem caracteres especiais)'
print(f'✓ Senha trocada em server/.env — {len(senha)} caracteres {mudou}')
print(f'  host: {u.hostname}  ·  usuário: {u.username}  ·  banco: {u.path.lstrip("/")}')

# deixa a string pronta na área de transferência, para colar no Render
import subprocess
subprocess.run(['pbcopy'], input=nova.encode('utf-8'), check=True)
print('✓ Connection string completa copiada para a área de transferência (cole no Render).')
PY

echo
echo "Testando a conexão…"
npx tsx scripts/check-db.ts
