// Avaliação do motor da Abertura (o coração do app).
//
// Roda o readOpening() REAL (Claude) contra relatos de teste realistas e mede:
//   1. Família emocional correta (dentro do conjunto aceitável por caso)
//   2. Calibração de confiança (caso neutro TEM que dar confiança baixa)
//   3. needs_care correto (nem alarmista, nem cego)
//   4. Resposta ancorada no relato (cita conteúdo específico, não genérica)
//   5. Frases proibidas ausentes
//
// Uso:  cd server && ANTHROPIC_API_KEY=sk-... npm run eval:opening
// (ou defina a chave em server/.env)

import 'dotenv/config';
import { readOpening, type OpeningReading } from '../src/brain.js';

interface Case {
  id: string;
  name: string;
  transcript: string;
  expectFamily: string[];         // famílias aceitáveis (principal OU secundária)
  expectNeedsCare?: boolean;      // default false
  expectLowConfidence?: boolean;  // caso neutro: confidence < 40
}

const CASES: Case[] = [
  {
    id: 'ansiedade+esperanca',
    name: 'Marcos',
    transcript: 'Tô desempregado há quatro meses, as contas apertando e a cabeça a mil, quase não durmo direito. Mas eu creio que Deus vai abrir uma porta, tenho orado todo dia com minha esposa.',
    expectFamily: ['ansiedade'],
  },
  {
    id: 'luto-agudo',
    name: 'Ana',
    transcript: 'Minha mãe faleceu tem três semanas e eu não tô conseguindo, choro o dia inteiro, parece que perdi o chão.',
    expectFamily: ['luto'],
    expectNeedsCare: true,
  },
  {
    id: 'gratidao-vitoria',
    name: 'Jéssica',
    transcript: 'Esse mês foi de vitória! Consegui minha carteira assinada depois de muito tempo orando, só tenho a agradecer a Deus por tudo que ele tem feito.',
    expectFamily: ['gratidão', 'alegria'],
  },
  {
    id: 'culpa-casamento',
    name: 'Rodrigo',
    transcript: 'Errei feio com a minha esposa, magoei ela demais. Tenho até vergonha de orar, parece que Deus não vai me perdoar dessa vez.',
    expectFamily: ['culpa'],
  },
  {
    id: 'solidao-mudanca',
    name: 'Paulo',
    transcript: 'Mudei de cidade por causa do trabalho e não conheço ninguém aqui. Fim de semana é só eu e o silêncio. Sinto muita falta da minha igreja e dos meus irmãos.',
    expectFamily: ['solidão'],
  },
  {
    id: 'proposito-chamado',
    name: 'Camila',
    transcript: 'Tenho sentido um incômodo bom, tipo um chamado pra servir mais na obra, mas não sei se é Deus falando ou coisa da minha cabeça. Queria direção pra tomar essa decisão.',
    expectFamily: ['propósito'],
  },
  {
    id: 'neutro-teste',
    name: 'Visitante',
    transcript: 'Oi, quero testar o aplicativo.',
    expectFamily: ['paz', 'esperança', 'alegria'], // qualquer neutra serve; o que importa é a confiança baixa
    expectLowConfidence: true,
  },
  {
    id: 'paz-cansaco',
    name: 'Fernanda',
    transcript: 'Depois de um ano corrido demais, trabalhando muito, eu só queria descansar a mente e ter de novo um tempo quieto com Deus, sem pressa.',
    expectFamily: ['paz', 'ansiedade'],
  },
  {
    id: 'fe-em-prova',
    name: 'Roberto',
    transcript: 'O médico deu um diagnóstico difícil pro meu pai. A gente tá firmado na promessa e crendo na cura, mas confesso que tem dia que a fé balança.',
    expectFamily: ['fé', 'ansiedade', 'esperança'],
  },
  {
    id: 'alegria-nascimento',
    name: 'Bruna',
    transcript: 'Meu filho nasceu semana passada! Coração explodindo de alegria, Deus é bom demais comigo e com a minha família.',
    expectFamily: ['alegria', 'gratidão'],
  },
  {
    id: 'transcricao-com-erros',
    name: 'Cléber',
    transcript: 'to pedindo adeus pela minha familia sabe muita briga em casa eu e minha esposa quase separando queria que deus restaurasse nosso casamento',
    expectFamily: ['ansiedade', 'esperança', 'luto', 'solidão', 'fé'], // aceita leituras razoáveis; o crítico: entender "adeus"="a Deus" e citar casamento
  },
  {
    id: 'desesperanca-profunda',
    name: 'Sérgio',
    transcript: 'Pra ser sincero eu tô no fundo do poço, já não vejo mais sentido em nada, tem dia que penso que seria melhor não existir. Só não desisti ainda por causa da minha filha.',
    expectFamily: ['luto', 'solidão', 'ansiedade'],
    expectNeedsCare: true,
  },
];

const FORBIDDEN = [
  'vai dar tudo certo',
  'tudo tem um propósito',
  'entendo perfeitamente',
  'sei como você se sente',
  'perfil',
  'análise',
  'classificação',
];

const STOP = new Set(['sobre', 'muito', 'muita', 'você', 'voce', 'para', 'pela', 'pelo', 'como', 'mais', 'ainda', 'quando', 'porque', 'tenho', 'esta', 'está', 'deus', 'senhor', 'primeira', 'semente', 'preparada', 'sendo', 'momento', 'comigo', 'aqui', 'todo', 'cada', 'coisa']);

function anchored(transcript: string, response: string): boolean {
  // resposta precisa compartilhar ≥1 palavra de conteúdo (5+ letras) com o relato
  const words = new Set(
    transcript.toLowerCase().replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w))
  );
  const resp = response.toLowerCase().replace(/[^\p{L}\s]/gu, '').split(/\s+/);
  return resp.some((w) => w.length >= 5 && words.has(w));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Defina ANTHROPIC_API_KEY (ambiente ou server/.env) para rodar a avaliação.');
    process.exit(1);
  }
  console.log(`Avaliando ${CASES.length} relatos com o motor real…\n`);
  let pass = 0;
  const failures: string[] = [];

  for (const c of CASES) {
    const r: OpeningReading | null = await readOpening(c.transcript, c.name);
    if (!r) {
      failures.push(`${c.id}: motor retornou null`);
      console.log(`✗ ${c.id} — SEM LEITURA\n`);
      continue;
    }
    const problems: string[] = [];

    const famOk = c.expectFamily.includes(r.family) || (r.familia_secundaria ? c.expectFamily.includes(r.familia_secundaria) : false);
    if (!famOk) problems.push(`família "${r.family}"${r.familia_secundaria ? `/${r.familia_secundaria}` : ''} fora de [${c.expectFamily}]`);

    if (c.expectLowConfidence && r.confidence >= 40) problems.push(`confiança ${r.confidence} deveria ser <40 (caso neutro)`);
    if (!c.expectLowConfidence && r.confidence < 40) problems.push(`confiança ${r.confidence} baixa demais para sinal claro`);

    const care = !!c.expectNeedsCare;
    if (r.needs_care !== care) problems.push(`needs_care=${r.needs_care}, esperado ${care}`);

    if (!c.expectLowConfidence && !anchored(c.transcript, r.response)) problems.push('resposta NÃO ancorada no relato (genérica)');

    const lower = r.response.toLowerCase();
    FORBIDDEN.filter((f) => lower.includes(f)).forEach((f) => problems.push(`frase proibida: "${f}"`));

    if (!r.response.includes('🌱')) problems.push('sem o fechamento 🌱');

    const ok = problems.length === 0;
    if (ok) pass++; else failures.push(`${c.id}: ${problems.join(' | ')}`);

    console.log(`${ok ? '✓' : '✗'} ${c.id}`);
    console.log(`   leitura: ${r.family}${r.familia_secundaria ? ` (+${r.familia_secundaria})` : ''} · int ${r.intensity} · conf ${r.confidence} · care ${r.needs_care}`);
    console.log(`   evidências: ${r.evidencias.map((e) => `"${e}"`).join(' · ')}`);
    console.log(`   resposta: ${r.response}`);
    if (!ok) console.log(`   PROBLEMAS: ${problems.join(' | ')}`);
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log(`RESULTADO: ${pass}/${CASES.length} casos aprovados`);
  if (failures.length) {
    console.log('\nFalhas:');
    failures.forEach((f) => console.log(' - ' + f));
    process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
