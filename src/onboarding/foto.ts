// A foto do perfil, entre o aparelho e o cadastro.
//
// O QUE ISTO CONSERTA
//
// A foto era gravada em AsyncStorage e parava ali. Quem punha a foto pelo
// celular e depois entrava pelo notebook via o perfil vazio: são dois cofres
// diferentes, e nenhum sabia do outro. O mesmo defeito do nome, e a mesma
// suspeita injusta — parece que o app perdeu a foto, quando ela nunca saiu do
// aparelho onde foi escolhida.
//
// Agora AsyncStorage vira CACHE, não o original. O original mora no cadastro,
// e o carimbo `fotoEm` diz se o que está em cache ainda vale.
//
// POR QUE A CONVERSÃO É ESCRITA À MÃO
//
// `atob` e `btoa` existem no navegador e são polyfill no React Native — quando
// são. `Buffer` é do Node. `FileReader` tem comportamento próprio em cada lado.
// Escolher qualquer um deles é escolher um caminho que funciona onde eu testo e
// falha onde eu não testo, e a falha seria silenciosa: a foto simplesmente não
// sobe. Trinta linhas de aritmética não têm plataforma.

import { Platform } from 'react-native';
import { API_URL, getUserId, tokenDaSessao } from './aiClient';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Índice reverso do alfabeto, montado uma vez. */
const INDICE: Record<string, number> = {};
for (let i = 0; i < ALFABETO.length; i++) INDICE[ALFABETO[i]] = i;

export function bytesDeBase64(b64: string): Uint8Array {
  const limpo = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const sobra = limpo.length % 4;
  // 4 caracteres viram 3 bytes; uma sobra de 2 ou 3 caracteres vira 1 ou 2.
  const total = Math.floor(limpo.length / 4) * 3 + (sobra === 2 ? 1 : sobra === 3 ? 2 : 0);
  const saida = new Uint8Array(total);

  let p = 0;
  for (let i = 0; i < limpo.length; i += 4) {
    const a = INDICE[limpo[i]] ?? 0;
    const b = INDICE[limpo[i + 1]] ?? 0;
    const c = INDICE[limpo[i + 2]] ?? 0;
    const d = INDICE[limpo[i + 3]] ?? 0;
    if (p < total) saida[p++] = (a << 2) | (b >> 4);
    if (p < total) saida[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < total) saida[p++] = ((c & 3) << 6) | d;
  }
  return saida;
}

export function base64DeBytes(bytes: Uint8Array): string {
  let saida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const c = i + 2 < bytes.length ? bytes[i + 2] : undefined;

    saida += ALFABETO[a >> 2];
    saida += ALFABETO[((a & 3) << 4) | ((b ?? 0) >> 4)];
    saida += b === undefined ? '=' : ALFABETO[((b & 15) << 2) | ((c ?? 0) >> 6)];
    saida += c === undefined ? '=' : ALFABETO[c & 63];
  }
  return saida;
}

/** Separa `data:image/jpeg;base64,XXXX` no tipo e nos bytes. */
export function partesDaDataUri(uri: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(uri);
  if (!m) return null;
  return { mime: m[1] || 'image/jpeg', bytes: bytesDeBase64(m[3]) };
}

/**
 * O fetch que aceita bytes como corpo nos dois mundos.
 *
 * Na web o global basta. No nativo é o `expo/fetch`, o mesmo que o áudio usa:
 * ele aceita corpo binário sem depender de Blob nem de FileReader.
 */
async function fetchBinario(): Promise<typeof fetch> {
  if (Platform.OS === 'web') return fetch;
  const { fetch: nativo } = await import('expo/fetch');
  return nativo as unknown as typeof fetch;
}

async function cabecalhos(extra: Record<string, string> = {}) {
  const token = await tokenDaSessao();
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/**
 * Sobe a foto e devolve o carimbo novo, ou null quando não deu.
 *
 * Silencioso de propósito: quem acabou de escolher uma foto já a viu aparecer
 * na tela, porque o cache local é gravado antes. Falhar aqui atrasa a
 * sincronia, não estraga o gesto.
 */
export async function enviarFoto(dataUri: string): Promise<string | null> {
  if (!API_URL) return null;
  try {
    const partes = partesDaDataUri(dataUri);
    if (!partes) return null;

    const f = await fetchBinario();
    const userId = await getUserId();
    const res = await f(`${API_URL}/profile/${userId}/foto`, {
      method: 'PUT',
      headers: await cabecalhos({ 'Content-Type': partes.mime }),
      body: partes.bytes as any,
    });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j?.fotoEm === 'string' ? j.fotoEm : null;
  } catch {
    return null;
  }
}

/** Baixa a foto do cadastro como data URI, ou null se não houver. */
export async function baixarFoto(): Promise<string | null> {
  if (!API_URL) return null;
  try {
    const f = await fetchBinario();
    const userId = await getUserId();
    const res = await f(`${API_URL}/profile/${userId}/foto`, {
      headers: await cabecalhos(),
    });
    if (!res.ok) return null;
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    return `data:${mime};base64,${base64DeBytes(new Uint8Array(buffer))}`;
  } catch {
    return null;
  }
}

/** Apaga a foto do cadastro. O cache local é limpo por quem chama. */
export async function apagarFoto(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/profile/${userId}/foto`, {
      method: 'DELETE',
      headers: await cabecalhos(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
