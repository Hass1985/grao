# Grão — Documento de Construção do Protótipo (Lovable)

> **Como usar este documento**
> Este arquivo tem duas partes:
> 1. **PARTE 1 — Prompt para o Lovable**: cole o conteúdo do bloco no Lovable para ele gerar o app web.
> 2. **PARTE 2 — Código-fonte de referência**: implementação completa (React Native/Expo) que serve como espelho exato de design, conteúdo e comportamento.
>
> **Importante:** o Lovable gera um app **web** (React + Vite + Tailwind). Para empacotar como app **Android/iOS**, use o recurso de **Capacitor** do próprio Lovable (instruções na PARTE 3).

---

## Sobre o produto

**Grão** é um faithtech brasileiro. Entrega uma semente espiritual por dia — uma passagem bíblica escolhida para o momento emocional da pessoa, com reflexão, oração e prática, mais uma música. O canal principal é o WhatsApp; o app é o painel (campo, raiz, configurações).

- **Missão:** Tornar a fé uma prática diária, entregando a palavra certa no momento certo.
- **Visão:** Ser a semente diária de fé presente na rotina das pessoas.
- **Slogan:** Uma semente por dia.
- **Público:** Católicos e evangélicos (Bíblia como fonte comum, tradução conforme a tradição declarada).
- **Anti-streak:** o progresso é cumulativo (campo plantado), nunca um placar que zera.

---

# PARTE 1 — PROMPT PARA O LOVABLE

> Copie tudo dentro do bloco abaixo e cole como primeiro prompt no Lovable.

```
Crie um app mobile-first chamado "Grão" — um app cristão brasileiro de semente espiritual diária. Stack: React + Vite + TypeScript + Tailwind. Layout sempre em coluna estreita centralizada (max-width 480px), simulando um celular. Idioma: português do Brasil.

## SISTEMA DE DESIGN

Cores (use como tokens Tailwind):
- ambar:   #C07826  (cor de ação / destaque)
- palha:   #F7F0E2  (fundo principal)
- casca:   #3B2208  (texto principal)
- peneira: #EDE0C6  (cards / superfícies)
- ceu:     #3D6EBD  (apoio)
- white:   #FFFFFF
- casca em opacidades: 60%, 50%, 40%, 12% (texto secundário, bordas, divisores)

Tipografia:
- Serif (títulos, passagens bíblicas): "Fraunces", serif
- Sans (corpo, botões): "Inter", sans-serif
- Escala: 12 / 14 / 16 / 18 / 22 / 28 / 36 px

Símbolo da marca (componente SVG "GraoSymbol"): uma elipse (proporção ~3:2, mais larga que alta) com uma linha vertical no centro ligando o topo ao fundo da elipse. Props: size, color, filled. Quando filled=true: elipse preenchida com a cor e sem a linha. Quando filled=false: elipse só com contorno (strokeWidth 1.5) + linha vertical central. É um grão de trigo estilizado.

Estilo geral: fundo palha, cards peneira com borda arredondada (12–16px), botão principal âmbar com texto branco, tom calmo e editorial, bastante respiro/espaçamento.

## NAVEGAÇÃO

Fluxo de onboarding (stack, sem header), depois app principal (3 abas inferiores).

ONBOARDING (5 telas em sequência):
1. Welcome
2. Segment
3. Notification
4. WhatsApp
5. Plan  → ao concluir, entra no app principal

APP PRINCIPAL — tab bar inferior fixa, fundo palha, borda superior casca-12%, 3 abas com ícone GraoSymbol (28px). Aba ativa em âmbar (ícone filled), inativas em casca-40% (ícone contorno):
- Hoje
- Campo
- Raiz

## TELAS DE ONBOARDING

### 1. Welcome
Fundo palha. Centralizado verticalmente com 3 blocos (topo / meio / botão embaixo):
- Topo: GraoSymbol 64px âmbar contorno; "Grão" em serif 36px casca; "UMA SEMENTE POR DIA" em sans 14px casca-40%, maiúsculas, letter-spacing alto.
- Meio: texto serif 22px casca centralizado: "Todo dia, uma passagem bíblica escolhida para o momento que você está vivendo. Uma reflexão. Uma oração. Uma prática." + abaixo, sans 16px casca-60%: "Plantada no WhatsApp. Guardada no seu coração."
- Botão âmbar largura total "Começar" → vai para Segment.

### 2. Segment
Título serif 28px "Quem está chegando?"; subtítulo "Isso ajuda a personalizar sua semente diária."
- Label "PERFIL". Grade de 6 cards (3 colunas), cada card: rótulo + sub + faixa etária. Seleção única:
  Jovem/Masculino/13–24, Jovem/Feminino/13–24, Adulto/Masculino/25–59, Adulto/Feminino/25–59, Idoso/Masculino/60+, Idoso/Feminino/60+.
- Label "TRADIÇÃO". 2 cards lado a lado: "Evangélico", "Católico". Seleção única.
- Card selecionado: borda âmbar 2px, fundo branco, texto âmbar.
- Botão "Continuar" só habilita com perfil E tradição selecionados (desabilitado = fundo casca-40%). → Notification.

### 3. Notification
Título "Quando quer receber sua semente?"; subtítulo "Você vai receber via WhatsApp. Pode mudar isso depois."
Lista de 4 opções (card com rótulo+descrição à esquerda, horário à direita), seleção única, "Amanhecer" pré-selecionado:
- Amanhecer · 6h – 8h · "Comece o dia com a semente"
- Manhã · 8h – 10h · "Após o café da manhã"
- Meio-dia · 12h – 13h · "Uma pausa no seu dia"
- Noite · 20h – 22h · "Encerre o dia com calma"
Botão "Continuar" → WhatsApp.

### 4. WhatsApp
Título "Seu WhatsApp"; subtítulo "É por aqui que você vai receber sua semente todos os dias."
- Campo de texto "NÚMERO COM DDD", máscara (XX) XXXXX-XXXX, teclado numérico, placeholder "(11) 99999-9999".
- Checkbox de consentimento: "Concordo em receber mensagens do Grão no WhatsApp. Não compartilhamos seu número com terceiros."
- Botão "Continuar" habilita só com telefone ≥ 10 dígitos E consentimento marcado. → Plan.

### 5. Plan
Título "Escolha seu plano"; subtítulo "7 dias grátis para conhecer o Grão. Cancele quando quiser."
2 cards de plano (seleção única, "Anual" pré-selecionado):
- Anual — R$ 19,90 /mês — "12x de R$ 19,90 — R$ 238,80/ano" — badge âmbar "RECOMENDADO"
- Mensal — R$ 29,90 /mês — "Renovação automática mensal"
Botão "Começar 7 dias grátis" → entra no app principal (aba Hoje).
Texto legal pequeno: "No 8º dia, a cobrança é feita automaticamente. Cancele antes sem custo."

## TELAS DO APP PRINCIPAL

### Aba Hoje
- Header: GraoSymbol 32px âmbar contorno + data de hoje formatada em pt-BR ("domingo, 18 de maio"), capitalizada, sans 14px casca-60%.
- Card da semente (fundo peneira, raio 16, padding 20): duas tags no topo (tipo: Reflexão/Oração/Prática em pill casca-12%; família emocional em pill com borda casca-40%); passagem bíblica entre aspas em serif 18px; referência em sans-medium 14px âmbar; divisor; seções "REFLEXÃO", "ORAÇÃO", "PRÁTICA" (label maiúsculo casca-40% + corpo sans 16px casca).
- Card de música: divisor "○ — ○ — ○"; "MÚSICA PARA HOJE"; título serif; artista; links sublinhados âmbar "Spotify" e/ou "YouTube" (abrem URL em nova aba).
- Botão âmbar "Levar esta semente". Ao tocar, vira um estado: GraoSymbol 24px filled âmbar + "Semente plantada hoje" (texto âmbar).
- Link sublinhado "Estou passando por outra coisa" → abre um modal/sheet "O que você está sentindo?" com grade de 2 colunas das 10 famílias emocionais (emoji + nome). Tocar em qualquer uma fecha o modal. Botão "Fechar" no header do modal.

### Aba Campo
- Título serif 28px "Seu campo"; subtítulo "{N} sementes plantadas neste ciclo".
- Grade de 30 células, 5 colunas, quadradas. Cada célula:
  - dia já plantado ou hoje → GraoSymbol 36px filled âmbar
  - dia passado não plantado → GraoSymbol 36px contorno peneira
  - dia futuro → um pontinho pequeno casca-12% (não um grão)
- Legenda no rodapé (borda superior casca-12%): "Plantada" (grão filled âmbar), "Não plantada" (grão contorno casca-40%), "Dias futuros" (pontinho).
- NÃO existe contador de "streak/sequência". Faltar um dia não zera nada — só mostra solo vazio.

### Aba Raiz
- Título serif 28px "Raiz".
- Lista (FlatList) das sementes passadas. Cada entrada:
  - Cabeçalho: data formatada (maiúscula, sans 12px casca-40%) + badge à direita: grão 16px (filled âmbar se plantada / contorno casca-40% se não) + "Plantada"/"Não plantada".
  - SeedCard em modo compacto (só tags + passagem + referência, sem reflexão/oração/prática).
  - Card de música.
  - Separador casca-12% entre entradas.

## DADOS (mock)

Use exatamente o conteúdo de seeds da PARTE 2 deste documento (semente de hoje + 6 sementes passadas + 10 famílias emocionais com emoji). Tipos:
- SeedType: 'reflexão' | 'oração' | 'prática'
- EmotionalFamily: ansiedade | gratidão | luto | esperança | culpa | propósito | solidão | paz | alegria | fé
- Seed: { id, date, type, family, passage, reference, reflection, prayer, practice, music{title,artist,spotifyUrl?,youtubeUrl?}, planted }

Mantenha todos os textos em português exatamente como fornecidos. Não invente versículos novos.
```

---

# PARTE 2 — CÓDIGO-FONTE DE REFERÊNCIA (React Native / Expo)

> Implementação canônica. Use como fonte da verdade para textos, lógica e estilo ao revisar o que o Lovable gerar. Se preferir continuar no Expo em vez do Lovable, este é o app completo (18 arquivos).

## Estrutura de pastas

```
grao/
├── App.tsx
├── app.json
└── src/
    ├── theme/colors.ts
    ├── theme/typography.ts
    ├── data/seeds.ts
    ├── components/GraoSymbol.tsx
    ├── components/SeedCard.tsx
    ├── components/MusicCard.tsx
    ├── navigation/index.tsx
    └── screens/
        ├── Hoje.tsx
        ├── Campo.tsx
        ├── Raiz.tsx
        └── onboarding/
            ├── Welcome.tsx
            ├── Segment.tsx
            ├── Notification.tsx
            ├── WhatsApp.tsx
            └── Plan.tsx
```

## Comandos de setup (Expo)

```bash
npx create-expo-app grao --template blank-typescript
cd grao
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack react-native-screens react-native-safe-area-context react-native-svg react-native-gesture-handler @expo-google-fonts/fraunces @expo-google-fonts/inter expo-font expo-splash-screen
```

---

### `app.json`

```json
{
  "expo": {
    "name": "grao",
    "slug": "grao",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.hass1985.grao",
      "infoPlist": { "ITSAppUsesNonExemptEncryption": false }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "favicon": "./assets/favicon.png" },
    "plugins": ["expo-font"]
  }
}
```

### `App.tsx`

```tsx
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import 'react-native-gesture-handler';

import RootNavigator from './src/navigation';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);

  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Inter_400Regular,
    Inter_500Medium,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <RootNavigator
        isOnboarded={isOnboarded}
        onFinish={() => setIsOnboarded(true)}
      />
    </View>
  );
}
```

### `src/theme/colors.ts`

```ts
export const colors = {
  ambar: '#C07826',
  palha: '#F7F0E2',
  casca: '#3B2208',
  peneira: '#EDE0C6',
  ceu: '#3D6EBD',
  white: '#FFFFFF',
  casca60: 'rgba(59, 34, 8, 0.6)',
  casca50: 'rgba(59, 34, 8, 0.5)',
  casca40: 'rgba(59, 34, 8, 0.4)',
  casca12: 'rgba(59, 34, 8, 0.12)',
};
```

### `src/theme/typography.ts`

```ts
export const fonts = {
  serif: 'Fraunces_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};
```

### `src/data/seeds.ts`

```ts
export type SeedType = 'reflexão' | 'oração' | 'prática';
export type EmotionalFamily =
  | 'ansiedade'
  | 'gratidão'
  | 'luto'
  | 'esperança'
  | 'culpa'
  | 'propósito'
  | 'solidão'
  | 'paz'
  | 'alegria'
  | 'fé';

export interface Music {
  title: string;
  artist: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

export interface Seed {
  id: string;
  date: string;
  type: SeedType;
  family: EmotionalFamily;
  passage: string;
  reference: string;
  reflection: string;
  prayer: string;
  practice: string;
  music: Music;
  planted: boolean;
}

export const todaySeed: Seed = {
  id: 'seed-today',
  date: new Date().toISOString().split('T')[0],
  type: 'reflexão',
  family: 'esperança',
  passage:
    '"Porque eu sei os planos que tenho para vocês", diz o Senhor, "planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro."',
  reference: 'Jeremias 29:11',
  reflection:
    'Mesmo quando o presente parece incerto, existe um projeto maior traçado com cuidado para a sua vida. Hoje, permita-se confiar no que ainda não consegue ver.',
  prayer:
    'Senhor, ajuda-me a descansar nos teus planos quando os meus não fazem sentido. Que eu encontre paz sabendo que meu futuro está nas tuas mãos.',
  practice:
    'Escreva uma coisa boa que aconteceu hoje, por menor que seja. Deixe que ela seja evidência de que há cuidado no seu caminho.',
  music: {
    title: 'Tudo Vai Ser Bem',
    artist: 'Fernandinho',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Fernandinho+Tudo+Vai+Ser+Bem',
  },
  planted: false,
};

export const pastSeeds: Seed[] = [
  {
    id: 'seed-1',
    date: '2026-05-15',
    type: 'oração',
    family: 'ansiedade',
    passage:
      'Não andeis ansiosos por coisa alguma; antes em tudo fazei os vossos pedidos a Deus em oração e súplica com ações de graças.',
    reference: 'Filipenses 4:6',
    reflection:
      'A ansiedade nos faz carregar o amanhã antes da hora. A oração é o gesto de devolver ao Criador o peso que não foi feito para suas mãos.',
    prayer:
      'Pai, entrego hoje cada pensamento que me oprime. Que minha mente encontre repouso na tua presença.',
    practice:
      'Quando sentir a ansiedade subir, respire fundo três vezes e repita em voz baixa: "Eu entrego."',
    music: {
      title: 'Lugar Secreto',
      artist: 'Gabriela Rocha',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Gabriela+Rocha+Lugar+Secreto',
    },
    planted: true,
  },
  {
    id: 'seed-2',
    date: '2026-05-14',
    type: 'prática',
    family: 'gratidão',
    passage:
      'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.',
    reference: '1 Tessalonicenses 5:18',
    reflection:
      'A gratidão não nega a dor — ela encontra luz dentro dela. Agradecer é um ato de fé que treina os olhos para enxergar a graça.',
    prayer:
      'Senhor, abre meus olhos para as bênçãos que já estão aqui. Que a gratidão seja meu idioma primeiro.',
    practice:
      'Liste três coisas pequenas pelas quais você é grato hoje. Uma delas deve ser algo que normalmente passa despercebido.',
    music: {
      title: 'Quão Grande é o Meu Deus',
      artist: 'Soraya Moraes',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Soraya+Moraes+Quão+Grande',
    },
    planted: true,
  },
  {
    id: 'seed-3',
    date: '2026-05-13',
    type: 'reflexão',
    family: 'solidão',
    passage: 'Mesmo que eu ande pelo vale da sombra da morte, não temerei mal nenhum, pois tu estás comigo.',
    reference: 'Salmos 23:4',
    reflection:
      'A solidão dói porque fomos feitos para comunhão. Mas há uma presença que não abandona nem nos momentos em que ninguém mais está.',
    prayer: 'Deus, faz-te real para mim neste silêncio. Que eu sinta que não estou só.',
    practice:
      'Sente-se em silêncio por cinco minutos. Não tente resolver nada — apenas perceba que há algo além de você neste espaço.',
    music: {
      title: 'Deus Cuida de Mim',
      artist: 'Aline Barros',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Aline+Barros+Deus+Cuida+de+Mim',
    },
    planted: false,
  },
  {
    id: 'seed-4',
    date: '2026-05-12',
    type: 'oração',
    family: 'paz',
    passage:
      'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.',
    reference: 'Filipenses 4:7',
    reflection:
      'A paz verdadeira não vem da ausência de problemas, mas de uma presença maior do que qualquer problema.',
    prayer: 'Senhor, que tua paz que ultrapassa o entendimento guarde meu coração hoje.',
    practice:
      'Antes de dormir, coloque as mãos no peito e respire profundamente enquanto repete: "Paz, eu recebo."',
    music: {
      title: 'Paz Como um Rio',
      artist: 'Diante do Trono',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Diante+do+Trono+Paz+Como+Um+Rio',
    },
    planted: true,
  },
  {
    id: 'seed-5',
    date: '2026-05-11',
    type: 'prática',
    family: 'propósito',
    passage: 'Pois somos criação de Deus, criados em Cristo Jesus para fazer boas obras.',
    reference: 'Efésios 2:10',
    reflection:
      'Você não é um acidente. Cada dom, cada dor, cada experiência foi tecida com intenção. Sua vida tem peso e direção.',
    prayer: 'Deus, mostra-me hoje uma boa obra que só eu posso fazer. Que eu não desperdice o que me foi dado.',
    practice:
      'Faça algo pequeno e bom por alguém hoje, sem esperar reconhecimento. Uma mensagem, um gesto, uma palavra.',
    music: {
      title: 'Me Usa Senhor',
      artist: 'Fernandinho',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Fernandinho+Me+Usa+Senhor',
    },
    planted: true,
  },
  {
    id: 'seed-6',
    date: '2026-05-10',
    type: 'reflexão',
    family: 'fé',
    passage:
      'A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.',
    reference: 'Hebreus 11:1',
    reflection:
      'Fé não é ausência de dúvida — é escolher caminhar mesmo quando os olhos não alcançam o destino. É o músculo que se fortalece exatamente quando o chão some.',
    prayer: 'Senhor, aumenta a minha fé. Que eu confie no que ainda não consigo ver.',
    practice:
      'Escreva uma promessa bíblica que você quer acreditar mais profundamente. Leia em voz alta três vezes.',
    music: {
      title: 'Nada Além do Sangue',
      artist: 'Ministério Zoe',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Ministério+Zoe+Nada+Além+do+Sangue',
    },
    planted: true,
  },
];

export const emotionalFamilies: { id: EmotionalFamily; label: string; emoji: string }[] = [
  { id: 'ansiedade', label: 'Ansiedade', emoji: '😰' },
  { id: 'gratidão', label: 'Gratidão', emoji: '🙏' },
  { id: 'luto', label: 'Luto', emoji: '💔' },
  { id: 'esperança', label: 'Esperança', emoji: '🌱' },
  { id: 'culpa', label: 'Culpa', emoji: '😔' },
  { id: 'propósito', label: 'Propósito', emoji: '🧭' },
  { id: 'solidão', label: 'Solidão', emoji: '🌑' },
  { id: 'paz', label: 'Paz', emoji: '☁️' },
  { id: 'alegria', label: 'Alegria', emoji: '✨' },
  { id: 'fé', label: 'Fé', emoji: '🕊️' },
];
```

### `src/components/GraoSymbol.tsx`

```tsx
import React from 'react';
import Svg, { Ellipse, Line } from 'react-native-svg';

interface GraoSymbolProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default function GraoSymbol({ size = 40, color = '#C07826', filled = false }: GraoSymbolProps) {
  const rx = size * 0.575;
  const ry = size * 0.375;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 1.5}
      />
      {!filled && (
        <Line x1={cx} y1={cy - ry} x2={cx} y2={cy + ry} stroke={color} strokeWidth={1.5} />
      )}
    </Svg>
  );
}
```

### `src/components/SeedCard.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

interface SeedCardProps {
  seed: Seed;
  compact?: boolean;
}

const typeLabel: Record<string, string> = {
  reflexão: 'Reflexão',
  oração: 'Oração',
  prática: 'Prática',
};

export default function SeedCard({ seed, compact = false }: SeedCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{typeLabel[seed.type]}</Text>
        </View>
        <View style={[styles.tag, styles.tagSecondary]}>
          <Text style={styles.tagText}>{seed.family.charAt(0).toUpperCase() + seed.family.slice(1)}</Text>
        </View>
      </View>

      <Text style={styles.passage}>"{seed.passage}"</Text>
      <Text style={styles.reference}>{seed.reference}</Text>

      {!compact && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Reflexão</Text>
          <Text style={styles.body}>{seed.reflection}</Text>

          <Text style={styles.sectionLabel}>Oração</Text>
          <Text style={styles.body}>{seed.prayer}</Text>

          <Text style={styles.sectionLabel}>Prática</Text>
          <Text style={styles.body}>{seed.practice}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: colors.casca12, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  tagSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.casca40 },
  tagText: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca60,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  passage: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.casca, lineHeight: 28, marginBottom: 8 },
  reference: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.ambar, marginBottom: 8 },
  divider: { height: 1, backgroundColor: colors.casca12, marginVertical: 20 },
  sectionLabel: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12,
  },
  body: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca, lineHeight: 24 },
});
```

### `src/components/MusicCard.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Music } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

interface MusicCardProps {
  music: Music;
}

export default function MusicCard({ music }: MusicCardProps) {
  const openLink = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.divider}>○ — ○ — ○</Text>
      <Text style={styles.label}>Música para hoje</Text>
      <Text style={styles.title}>{music.title}</Text>
      <Text style={styles.artist}>{music.artist}</Text>
      <View style={styles.links}>
        {music.spotifyUrl && (
          <TouchableOpacity onPress={() => openLink(music.spotifyUrl)}>
            <Text style={styles.link}>Spotify</Text>
          </TouchableOpacity>
        )}
        {music.youtubeUrl && (
          <TouchableOpacity onPress={() => openLink(music.youtubeUrl)}>
            <Text style={styles.link}>YouTube</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 20 },
  divider: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca40, marginBottom: 16, letterSpacing: 4 },
  label: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.casca, marginBottom: 4 },
  artist: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60, marginBottom: 16 },
  links: { flexDirection: 'row', gap: 16 },
  link: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.ambar, textDecorationLine: 'underline' },
});
```

### `src/navigation/index.tsx`

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Welcome from '../screens/onboarding/Welcome';
import Segment from '../screens/onboarding/Segment';
import Notification from '../screens/onboarding/Notification';
import WhatsApp from '../screens/onboarding/WhatsApp';
import Plan from '../screens/onboarding/Plan';

import Hoje from '../screens/Hoje';
import Campo from '../screens/Campo';
import Raiz from '../screens/Raiz';

import GraoSymbol from '../components/GraoSymbol';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.palha,
          borderTopColor: colors.casca12,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11, marginTop: 2 },
        tabBarActiveTintColor: colors.ambar,
        tabBarInactiveTintColor: colors.casca40,
      }}
    >
      <Tab.Screen
        name="Hoje"
        component={Hoje}
        options={{ tabBarIcon: ({ color, focused }) => <GraoSymbol size={28} color={color} filled={focused} /> }}
      />
      <Tab.Screen
        name="Campo"
        component={Campo}
        options={{ tabBarIcon: ({ color }) => <GraoSymbol size={28} color={color} filled={false} /> }}
      />
      <Tab.Screen
        name="Raiz"
        component={Raiz}
        options={{ tabBarIcon: ({ color }) => <GraoSymbol size={28} color={color} filled={false} /> }}
      />
    </Tab.Navigator>
  );
}

interface OnboardingNavigatorProps {
  onFinish: () => void;
}

function OnboardingNavigator({ onFinish }: OnboardingNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Segment" component={Segment} />
      <Stack.Screen name="Notification" component={Notification} />
      <Stack.Screen name="WhatsApp" component={WhatsApp} />
      <Stack.Screen name="Plan">
        {() => <Plan onFinish={onFinish} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

interface RootNavigatorProps {
  isOnboarded: boolean;
  onFinish: () => void;
}

export default function RootNavigator({ isOnboarded, onFinish }: RootNavigatorProps) {
  return (
    <NavigationContainer>
      {isOnboarded ? <MainNavigator /> : <OnboardingNavigator onFinish={onFinish} />}
    </NavigationContainer>
  );
}
```

### `src/screens/Hoje.tsx`

```tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, FlatList,
} from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import SeedCard from '../components/SeedCard';
import MusicCard from '../components/MusicCard';
import { todaySeed, emotionalFamilies } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

export default function Hoje() {
  const [planted, setPlanted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <GraoSymbol size={32} color={colors.ambar} filled={false} />
          <Text style={styles.date}>{today}</Text>
        </View>

        <View style={styles.seedContainer}>
          <SeedCard seed={todaySeed} />
        </View>

        <MusicCard music={todaySeed.music} />

        {!planted ? (
          <TouchableOpacity style={styles.plantButton} onPress={() => setPlanted(true)} activeOpacity={0.85}>
            <Text style={styles.plantButtonText}>Levar esta semente</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.plantedState}>
            <GraoSymbol size={24} color={colors.ambar} filled={true} />
            <Text style={styles.plantedText}>Semente plantada hoje</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.otherLink}>
          <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>O que você está sentindo?</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={emotionalFamilies}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.familyList}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.familyCard} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.familyEmoji}>{item.emoji}</Text>
                <Text style={styles.familyLabel}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 24, marginBottom: 24 },
  date: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60, textTransform: 'capitalize' },
  seedContainer: { backgroundColor: colors.peneira, borderRadius: 16, padding: 20, marginBottom: 8 },
  plantButton: { backgroundColor: colors.ambar, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  plantButtonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
  plantedState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginBottom: 16 },
  plantedText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.ambar },
  otherLink: { alignItems: 'center', paddingVertical: 8 },
  otherLinkText: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60, textDecorationLine: 'underline' },
  modal: { flex: 1, backgroundColor: colors.palha },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.casca12,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.casca },
  modalClose: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.ambar },
  familyList: { paddingHorizontal: 24, paddingTop: 20, gap: 10 },
  familyCard: { flex: 1, backgroundColor: colors.peneira, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  familyEmoji: { fontSize: 28 },
  familyLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.casca },
});
```

### `src/screens/Campo.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import { pastSeeds } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const TOTAL_CELLS = 30;
const COLUMNS = 5;

export default function Campo() {
  const plantedCount = pastSeeds.filter((s) => s.planted).length + 1;

  const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => {
    const dayIndex = i + 1;
    if (dayIndex === plantedCount) return 'today';
    if (dayIndex < plantedCount) {
      const seed = pastSeeds[TOTAL_CELLS - dayIndex];
      return seed?.planted ? 'planted' : 'empty';
    }
    return 'future';
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Seu campo</Text>
        <Text style={styles.subtitle}>
          {plantedCount} {plantedCount === 1 ? 'semente plantada' : 'sementes plantadas'} neste ciclo
        </Text>

        <View style={styles.grid}>
          {cells.map((cell, i) => (
            <View key={i} style={styles.cell}>
              {cell === 'future' ? (
                <View style={styles.emptyCell} />
              ) : cell === 'planted' || cell === 'today' ? (
                <GraoSymbol size={36} color={colors.ambar} filled={true} />
              ) : (
                <GraoSymbol size={36} color={colors.peneira} filled={false} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <GraoSymbol size={18} color={colors.ambar} filled={true} />
            <Text style={styles.legendText}>Plantada</Text>
          </View>
          <View style={styles.legendItem}>
            <GraoSymbol size={18} color={colors.casca40} filled={false} />
            <Text style={styles.legendText}>Não plantada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Dias futuros</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 4 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca60, marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 32 },
  cell: { width: `${100 / COLUMNS - 4}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  emptyCell: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.casca12 },
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: colors.casca12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca60 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.casca12 },
});
```

### `src/screens/Raiz.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import SeedCard from '../components/SeedCard';
import MusicCard from '../components/MusicCard';
import { pastSeeds, Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function SeedEntry({ seed }: { seed: Seed }) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(seed.date)}</Text>
        <View style={styles.plantedBadge}>
          <GraoSymbol size={16} color={seed.planted ? colors.ambar : colors.casca40} filled={seed.planted} />
          <Text style={[styles.plantedLabel, !seed.planted && styles.plantedLabelEmpty]}>
            {seed.planted ? 'Plantada' : 'Não plantada'}
          </Text>
        </View>
      </View>
      <SeedCard seed={seed} compact={true} />
      <MusicCard music={seed.music} />
    </View>
  );
}

export default function Raiz() {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={pastSeeds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={styles.title}>Raiz</Text>}
        renderItem={({ item, index }) => (
          <>
            <SeedEntry seed={item} />
            {index < pastSeeds.length - 1 && <View style={styles.separator} />}
          </>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  list: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 32 },
  entry: { marginBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  entryDate: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 0.5, flex: 1,
  },
  plantedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plantedLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.ambar },
  plantedLabelEmpty: { color: colors.casca40 },
  separator: { height: 1, backgroundColor: colors.casca12, marginVertical: 28 },
});
```

### `src/screens/onboarding/Welcome.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import GraoSymbol from '../../components/GraoSymbol';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = { navigation: StackNavigationProp<any> };

export default function Welcome({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.palha} />
      <View style={styles.content}>
        <View style={styles.header}>
          <GraoSymbol size={64} color={colors.ambar} filled={false} />
          <Text style={styles.name}>Grão</Text>
          <Text style={styles.slogan}>Uma semente por dia</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.description}>
            Todo dia, uma passagem bíblica escolhida para o momento que você está vivendo. Uma reflexão. Uma oração. Uma prática.
          </Text>
          <Text style={styles.subdescription}>Plantada no WhatsApp. Guardada no seu coração.</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Segment')} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Começar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between', paddingTop: 80, paddingBottom: 48 },
  header: { alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.serif, fontSize: fontSizes.xxxl, color: colors.casca, letterSpacing: -0.5 },
  slogan: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 2,
  },
  body: { gap: 16 },
  description: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.casca, lineHeight: 32, textAlign: 'center' },
  subdescription: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca60, textAlign: 'center', lineHeight: 24 },
  button: { backgroundColor: colors.ambar, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white, letterSpacing: 0.5 },
});
```

### `src/screens/onboarding/Segment.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = { navigation: StackNavigationProp<any> };

const segments = [
  { id: 'young_m', label: 'Jovem', sublabel: 'Masculino', age: '13–24' },
  { id: 'young_f', label: 'Jovem', sublabel: 'Feminino', age: '13–24' },
  { id: 'adult_m', label: 'Adulto', sublabel: 'Masculino', age: '25–59' },
  { id: 'adult_f', label: 'Adulto', sublabel: 'Feminino', age: '25–59' },
  { id: 'elder_m', label: 'Idoso', sublabel: 'Masculino', age: '60+' },
  { id: 'elder_f', label: 'Idoso', sublabel: 'Feminino', age: '60+' },
];

const traditions = [
  { id: 'evangelical', label: 'Evangélico' },
  { id: 'catholic', label: 'Católico' },
];

export default function Segment({ navigation }: Props) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);
  const canContinue = selectedSegment !== null && selectedTradition !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Quem está chegando?</Text>
        <Text style={styles.subtitle}>Isso ajuda a personalizar sua semente diária.</Text>

        <Text style={styles.sectionLabel}>Perfil</Text>
        <View style={styles.grid}>
          {segments.map((seg) => (
            <TouchableOpacity
              key={seg.id}
              style={[styles.card, selectedSegment === seg.id && styles.cardSelected]}
              onPress={() => setSelectedSegment(seg.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cardLabel, selectedSegment === seg.id && styles.cardLabelSelected]}>{seg.label}</Text>
              <Text style={[styles.cardSub, selectedSegment === seg.id && styles.cardSubSelected]}>{seg.sublabel}</Text>
              <Text style={[styles.cardAge, selectedSegment === seg.id && styles.cardAgeSelected]}>{seg.age}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Tradição</Text>
        <View style={styles.row}>
          {traditions.map((trad) => (
            <TouchableOpacity
              key={trad.id}
              style={[styles.tradCard, selectedTradition === trad.id && styles.cardSelected, { flex: 1 }]}
              onPress={() => setSelectedTradition(trad.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cardLabel, selectedTradition === trad.id && styles.cardLabelSelected]}>{trad.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={() => canContinue && navigation.navigate('Notification')}
          activeOpacity={canContinue ? 0.85 : 1}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca60, marginBottom: 32, lineHeight: 24 },
  sectionLabel: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  card: {
    width: '30%', backgroundColor: colors.peneira, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  tradCard: {
    backgroundColor: colors.peneira, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  cardSelected: { borderColor: colors.ambar, backgroundColor: colors.white },
  cardLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.casca },
  cardLabelSelected: { color: colors.ambar },
  cardSub: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca60, marginTop: 2 },
  cardSubSelected: { color: colors.casca60 },
  cardAge: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca40, marginTop: 2 },
  cardAgeSelected: { color: colors.casca40 },
  button: { backgroundColor: colors.ambar, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.casca40 },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
});
```

### `src/screens/onboarding/Notification.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = { navigation: StackNavigationProp<any> };

const windows = [
  { id: 'dawn', label: 'Amanhecer', time: '6h – 8h', description: 'Comece o dia com a semente' },
  { id: 'morning', label: 'Manhã', time: '8h – 10h', description: 'Após o café da manhã' },
  { id: 'noon', label: 'Meio-dia', time: '12h – 13h', description: 'Uma pausa no seu dia' },
  { id: 'evening', label: 'Noite', time: '20h – 22h', description: 'Encerre o dia com calma' },
];

export default function Notification({ navigation }: Props) {
  const [selected, setSelected] = useState('dawn');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Quando quer receber sua semente?</Text>
        <Text style={styles.subtitle}>Você vai receber via WhatsApp. Pode mudar isso depois.</Text>

        <View style={styles.list}>
          {windows.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.item, selected === w.id && styles.itemSelected]}
              onPress={() => setSelected(w.id)}
              activeOpacity={0.8}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemLabel, selected === w.id && styles.itemLabelSelected]}>{w.label}</Text>
                <Text style={styles.itemDesc}>{w.description}</Text>
              </View>
              <Text style={[styles.itemTime, selected === w.id && styles.itemTimeSelected]}>{w.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('WhatsApp')} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, justifyContent: 'space-between' },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca60, lineHeight: 24, marginBottom: 32 },
  list: { gap: 10 },
  item: {
    backgroundColor: colors.peneira, borderRadius: 12, padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  itemSelected: { borderColor: colors.ambar, backgroundColor: colors.white },
  itemLeft: { gap: 4 },
  itemLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.casca },
  itemLabelSelected: { color: colors.ambar },
  itemDesc: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60 },
  itemTime: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.casca40 },
  itemTimeSelected: { color: colors.ambar },
  button: { backgroundColor: colors.ambar, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
});
```

### `src/screens/onboarding/WhatsApp.tsx`

```tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = { navigation: StackNavigationProp<any> };

export default function WhatsApp({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const canContinue = phone.replace(/\D/g, '').length >= 10 && consent;

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Seu WhatsApp</Text>
          <Text style={styles.subtitle}>É por aqui que você vai receber sua semente todos os dias.</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Número com DDD</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(formatPhone(t))}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.casca40}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <TouchableOpacity style={styles.consentRow} onPress={() => setConsent(!consent)} activeOpacity={0.8}>
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              Concordo em receber mensagens do Grão no WhatsApp. Não compartilhamos seu número com terceiros.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={() => canContinue && navigation.navigate('Plan')}
            activeOpacity={canContinue ? 0.85 : 1}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, flexGrow: 1, justifyContent: 'space-between' },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca60, lineHeight: 24, marginBottom: 40 },
  inputContainer: { marginBottom: 24 },
  inputLabel: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white, borderRadius: 12, padding: 16, fontFamily: fonts.sans,
    fontSize: fontSizes.lg, color: colors.casca, borderWidth: 1, borderColor: colors.casca12,
  },
  consentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 40 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.casca40,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.ambar, borderColor: colors.ambar },
  checkmark: { color: colors.white, fontSize: 13, fontFamily: fonts.sansMedium },
  consentText: { flex: 1, fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60, lineHeight: 20 },
  button: { backgroundColor: colors.ambar, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.casca40 },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
});
```

### `src/screens/onboarding/Plan.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = { onFinish: () => void };

const plans = [
  {
    id: 'annual', label: 'Anual', price: 'R$ 19,90', period: '/mês',
    detail: '12x de R$ 19,90 — R$ 238,80/ano', badge: 'RECOMENDADO',
  },
  {
    id: 'monthly', label: 'Mensal', price: 'R$ 29,90', period: '/mês',
    detail: 'Renovação automática mensal', badge: null,
  },
];

export default function Plan({ onFinish }: Props) {
  const [selected, setSelected] = useState('annual');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Escolha seu plano</Text>
        <Text style={styles.subtitle}>7 dias grátis para conhecer o Grão. Cancele quando quiser.</Text>

        <View style={styles.list}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.card, selected === plan.id && styles.cardSelected]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.planLabel, selected === plan.id && styles.planLabelSelected]}>{plan.label}</Text>
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.price, selected === plan.id && styles.priceSelected]}>{plan.price}</Text>
                <Text style={styles.period}>{plan.period}</Text>
              </View>
              <Text style={styles.detail}>{plan.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={onFinish} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Começar 7 dias grátis</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>No 8º dia, a cobrança é feita automaticamente. Cancele antes sem custo.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca60, lineHeight: 24, marginBottom: 32 },
  list: { gap: 12, marginBottom: 32 },
  card: { backgroundColor: colors.peneira, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: colors.ambar, backgroundColor: colors.white },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.casca },
  planLabelSelected: { color: colors.ambar },
  badge: { backgroundColor: colors.ambar, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.white, letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  price: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca },
  priceSelected: { color: colors.ambar },
  period: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60 },
  detail: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca60 },
  button: { backgroundColor: colors.ambar, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
  legal: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca40, textAlign: 'center', lineHeight: 18 },
});
```

---

# PARTE 3 — COMO TRANSFORMAR EM APP ANDROID E iOS

O Lovable entrega um app **web**. Para virar app nativo (Android/iOS), o caminho oficial dele é **Capacitor**:

1. No Lovable, gere o app web colando o prompt da PARTE 1.
2. Refine as telas conversando com o Lovable até bater com o código de referência da PARTE 2.
3. Conecte o projeto Lovable ao **GitHub** (botão nativo do Lovable — você já tem o repositório `Hass1985/grao`).
4. Clone o repositório na sua máquina e adicione o Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init grao com.hass1985.grao
   npm install @capacitor/ios @capacitor/android
   npx cap add ios
   npx cap add android
   npm run build
   npx cap sync
   ```
5. Abrir cada plataforma:
   ```bash
   npx cap open android   # abre no Android Studio
   npx cap open ios       # abre no Xcode
   ```

> **Observação:** assim como no Expo, o build para **iOS** exige conta paga no **Apple Developer Program** (US$ 99/ano). **Android** é gratuito. Para testes rápidos sem build nativo, o próprio preview web do Lovable já roda no navegador do celular.

---

## Resumo do fluxo recomendado

1. **Lovable** → cole o prompt da PARTE 1 → gere e refine o app web.
2. **PARTE 2** → use como gabarito para corrigir textos, cores e comportamento.
3. **PARTE 3** → Capacitor + GitHub para empacotar Android/iOS quando o web estiver aprovado.
