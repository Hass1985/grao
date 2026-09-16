// Áudio do WhatsApp virando texto.
//
// O público que mais precisa do Grão é o que menos digita: gente mais velha,
// que manda áudio para tudo e escreve com dificuldade. Pedir "me conta por
// escrito" para essa pessoa é pedir que ela desista.
//
// O Claude não recebe áudio, então o caminho tem duas pernas: baixar o arquivo
// da Cloud API da Meta (que guarda a mídia por alguns dias atrás de um
// endpoint autenticado) e mandar para um serviço de transcrição.
//
// O serviço é qualquer um com a interface /audio/transcriptions — a mesma da
// OpenAI, que Groq e vários outros copiaram. Fica em variável de ambiente
// porque o preço desse mercado cai todo semestre, e trocar de fornecedor não
// deve custar um deploy de código.
//
// Sem chave configurada, devolve null em silêncio e o fluxo pede texto. Áudio
// é um confort, não um pré-requisito: um serviço fora do ar não pode impedir
// alguém de contar como está.

const BASE = () => (process.env.STT_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const CHAVE = () => process.env.STT_API_KEY ?? '';
const MODELO = () => process.env.STT_MODEL || 'whisper-1';

const GRAPH = 'https://graph.facebook.com/v21.0';
const TOKEN = () => process.env.WA_ACCESS_TOKEN ?? '';

/** Teto de segurança: um minuto de voz cabe folgado em 3 MB. */
const MAX_BYTES = 8 * 1024 * 1024;

export function transcricaoConfigurada(): boolean {
  return !!CHAVE();
}

/**
 * Baixa a mídia da Meta.
 *
 * São duas chamadas, não uma: a primeira devolve uma URL temporária, e essa
 * URL ainda exige o mesmo token no cabeçalho. Baixar sem o Authorization
 * devolve 401 com corpo vazio — o erro mais confuso desta integração.
 */
async function baixarMidia(mediaId: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!TOKEN()) return null;
  try {
    const meta = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    });
    if (!meta.ok) {
      console.error(`[transcricao] metadados da mídia: HTTP ${meta.status}`);
      return null;
    }
    const j: any = await meta.json();
    if (!j?.url) return null;
    if (j.file_size && Number(j.file_size) > MAX_BYTES) {
      console.warn(`[transcricao] áudio grande demais: ${j.file_size} bytes`);
      return null;
    }

    const arquivo = await fetch(j.url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
    if (!arquivo.ok) {
      console.error(`[transcricao] download da mídia: HTTP ${arquivo.status}`);
      return null;
    }
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    if (bytes.length > MAX_BYTES) return null;
    return { bytes, mime: j.mime_type || 'audio/ogg' };
  } catch (e: any) {
    console.error('[transcricao] falha ao baixar a mídia:', e?.message || e);
    return null;
  }
}

/** Extensão que o serviço de transcrição reconhece a partir do mime da Meta. */
function extensaoDe(mime: string): string {
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('webm')) return 'webm';
  return 'ogg';   // o padrão do WhatsApp: opus dentro de ogg
}

/**
 * Áudio do WhatsApp → texto em português.
 *
 * `language: pt` não é detalhe: sem dizer o idioma, um "oi" solitário ou um
 * trecho com ruído de fundo é transcrito como inglês ou espanhol, e o motor
 * emocional recebe uma frase sem sentido.
 */
export async function transcreverAudioDoWhatsapp(mediaId: string): Promise<string | null> {
  if (!transcricaoConfigurada()) return null;

  const midia = await baixarMidia(mediaId);
  if (!midia) return null;

  try {
    const forma = new FormData();
    forma.append('file',
      new Blob([new Uint8Array(midia.bytes)], { type: midia.mime }),
      `audio.${extensaoDe(midia.mime)}`);
    forma.append('model', MODELO());
    forma.append('language', 'pt');
    forma.append('response_format', 'text');

    const res = await fetch(`${BASE()}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CHAVE()}` },
      body: forma,
    });

    if (!res.ok) {
      console.error(`[transcricao] serviço recusou: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const texto = (await res.text()).trim();
    // Transcrição vazia acontece com áudio mudo ou de um segundo. Devolver
    // string vazia faria o motor emocional ler o silêncio como um relato.
    return texto.length >= 2 ? texto : null;
  } catch (e: any) {
    console.error('[transcricao] falha ao transcrever:', e?.message || e);
    return null;
  }
}
