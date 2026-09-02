# Grão — Mercado e números (modelo bottom-up)

> Todos os números são **estimativas de trabalho, a validar** com Censo IBGE 2022, Datafolha e dados da própria Assembleia de Deus antes de apresentar como fato. O objetivo aqui é mostrar a **lógica** e a **ordem de grandeza** do potencial, não cravar valores.

## 1. Base do funil (quantas pessoas existem)

| Camada | Estimativa | Premissa / fonte a validar |
|---|---|---|
| População do Brasil | ~203 milhões | IBGE 2022 |
| Evangélicos | ~47 milhões (faixa 47–65M) | ~23–31% da população; grupo que mais cresce |
| **Assembleia de Deus (foco)** | **~12 milhões+** (até ~22M com todos os ministérios) | Maior denominação evangélica do país |
| Com smartphone | ~85% dos adultos | Penetração de smartphone no Brasil |
| WhatsApp | ~99% dos smartphones | Praticamente universal |

## 2. TAM · SAM · SOM (em usuários, não em reais)

| | Quem é | Tamanho | Como chego |
|---|---|---|---|
| **TAM** | Evangélicos com smartphone | ~40 milhões | Teto teórico |
| **SAM** | Praticantes ativos, digitais, dispostos a pagar por algo diário premium | ~10 milhões | ~25% do TAM. Alinha com o núcleo engajado da Assembleia (~6–8M) |
| **SOM** (3–5 anos) | Assinantes pagantes que conseguimos capturar | **200 mil a 500 mil** | 2% a 5% do SAM |

**Receita recorrente anual (ARR) no SOM, a R$ 19,90/mês:**

| Cenário | Assinantes | % do SAM | ARR |
|---|---|---|---|
| Conservador | 200 mil | 2% | **R$ 47,8 milhões** |
| Base | 350 mil | 3,5% | R$ 83,6 milhões |
| Otimista | 500 mil | 5% | R$ 119,4 milhões |

> Referência de tamanho: 200 mil assinantes é **menos de 0,5% dos evangélicos** e **~1,7% da Assembleia**. É uma fatia pequena de um público enorme e já reunido.

## 3. Rampa (como chego lá) — cenário base

| Momento | Assinantes pagantes | ARR (R$ 19,90/mês) | O que destrava |
|---|---|---|---|
| Ano 1 | 5.000 | ~R$ 1,2 mi | Piloto + primeiras 50 igrejas + WhatsApp em produção |
| Ano 2 | 40.000 | ~R$ 9,6 mi | Endosso denominacional + a ponte SP + motor de aquisição |
| Ano 3 | 150.000 | ~R$ 35,8 mi | Rede de igrejas/campos + indicação orgânica |
| Ano 4 | 300.000 | ~R$ 71,6 mi | Escala nacional na Assembleia + outras denominações |
| Ano 5 | 500.000 | ~R$ 119,4 mi | Consolidação + planos de igreja/família |

## 4. A conta por igreja (o motor de aquisição)

O canal não é ads, é a igreja. Por isso a unidade de crescimento é a **congregação/campo**.

| Premissa | Valor base | Observação |
|---|---|---|
| Membros por congregação | ~250 | Campos e sedes grandes têm milhares |
| Alcançados que fazem trial | ~30% | Endosso do líder puxa a adesão |
| Trial → pagante | ~20% | |
| **Pagantes por igreja de 250** | **~15** | ~6% dos membros |

- Para **150 mil pagantes** (Ano 3): ~**10.000 igrejas** — OU um número bem menor de **campos/convenções grandes** (um campo de 20–50 mil membros gera milhares de pagantes de uma vez).
- A Assembleia tem **dezenas de milhares de congregações** no Brasil. Com endosso denominacional + a ponte de SP, a meta é alcançável.

## 5. Preço (decisão de set/2026)

**A escada de preço foi abandonada.** Havia um plano de entrada a R$ 19,90 (só
WhatsApp) e um principal a R$ 49 (completo). Hoje existe **um preço só, e ele
entrega tudo**:

| Plano | Preço | Equivalente mensal |
|---|---|---|
| **Mensal** | **R$ 19,90/mês** | R$ 19,90 |
| Anual | R$ 199,00/ano | R$ 16,58 (2 meses de graça) |

**Todos os números deste documento usam R$ 19,90/mês.** É o preço de tabela e
o único que temos como fato.

**Sensibilidade do anual** (a adesão real só será conhecida no piloto): cada
10% da base que migra para o anual reduz a receita média em R$ 0,33/mês.

| Adesão ao anual | Receita média por assinante |
|---|---|
| 0% (só mensal) | R$ 19,90 |
| 20% | R$ 19,24 |
| 50% | R$ 18,24 |
| 100% (só anual) | R$ 16,58 |

Ou seja: mesmo no extremo de todo mundo no anual, a receita média cai 17%. A
faixa é estreita — bem mais previsível do que era com dois planos de preços
distantes.

**O que a decisão troca:** o preço principal caiu de R$ 49 para R$ 19,90, uma
queda de 59%. A aposta é que a conversão suba mais que isso — plausível,
porque o preço saiu de "uma decisão" para "quase nada" (ver seção 7). É a tese
a provar no piloto: **volume compensando ticket**.

## 6. Economia por assinante (unit economics)

| Métrica | Estimativa | Premissa |
|---|---|---|
| Receita por assinante | **R$ 19,90/mês** | preço de tabela; ver sensibilidade do anual na seção 5 |
| Custo por usuário (COGS) | R$ 2–5/mês | IA (cache no onboarding + seleção diária barata) + ~1 template WhatsApp/dia |
| **Margem bruta** | **~82%** | faixa de 75% (COGS R$ 5) a 90% (COGS R$ 2) |
| CAC via igreja | R$ 10–40 | Endosso do líder; vs. R$ 80–150 em ads |
| Churn mensal | ~5% (meta) | Puxado para baixo pelo hábito diário |
| Vida média | ~20 meses | 1 / churn |
| **LTV** | **~R$ 328** | 20 × R$ 19,90 × 82% |
| **LTV / CAC** | **8x a 33x** | 33x com CAC R$ 10 · 16x com R$ 20 · 8x com R$ 40 |

**Duas mudanças honestas em relação à versão anterior deste documento:**

1. **A margem caiu de ~90% para ~82%,** e agora é sensível ao COGS. Com receita
   de R$ 49, cada real de custo valia 2 pontos de margem; com R$ 19,90, vale 5.
   O custo do WhatsApp deixou de ser detalhe — é a alavanca a vigiar.
2. **O "LTV/CAC > 20x" não vale mais como afirmação geral.** Ele agora depende
   do CAC: acima de R$ 16 por assinante, cai abaixo de 20x. Continua saudável
   (o padrão de mercado é 3x), mas a frase precisa vir com a premissa junto.

## 7. Contexto de disposição a pagar (por que os números fecham)

O público evangélico já **investe dinheiro em fé**: dízimo (10% da renda), livros, congressos, streaming e shows gospel (mercado gospel movimenta **bilhões de reais/ano** no Brasil).

A R$ 19,90, o argumento fica quase trivial: são **R$ 0,66 por dia**, menos que um café. Para quem ganha um salário mínimo e dizima, é **cerca de 1,4% do que já destina à igreja todo mês**. O preço deixou de ser uma decisão de orçamento e virou um arredondamento — que é exatamente o efeito buscado ao abandonar a escada de planos.

O que falta não é disposição — é um **produto diário à altura**.

## 8. Riscos e sensibilidades (ser honesto com o sócio)

- **Preço/renda:** ~~risco principal~~ **em grande parte neutralizado** pelo preço único de R$ 19,90. O risco se inverteu: agora a pergunta não é se a pessoa pode pagar, é se o valor percebido sustenta a cobrança.
- **Margem sensível ao COGS:** a R$ 19,90 de receita por assinante, cada real de custo por usuário come 5 pontos de margem. O custo por mensagem do WhatsApp é a variável a monitorar desde o piloto.
- **Churn:** a tese inteira depende de virar hábito. É a métrica nº 1 a provar no piloto.
- **Conversão via igreja:** depende do endosso real dos líderes (por isso a ponte de SP é estratégica).
- **WhatsApp API:** custo por conversa e políticas da Meta (templates, opt-in) — impactam COGS.
- **Validação dos números de mercado:** confirmar evangélicos/Assembleia/penetração antes de apresentar.

---

### Resumo em uma linha
Público de **~40M** alcançáveis, alvo servível de **~10M**, capturando **200–500 mil** pagantes em 3–5 anos = **R$ 48M a R$ 119M de ARR**, com margem ~82% e aquisição de baixo custo via igreja.

A troca de R$ 49 por R$ 19,90 cortou a projeção pela metade — e comprou, em vez disso, um preço que praticamente elimina a objeção de renda no público-alvo. **A tese a provar no piloto deixou de ser "eles pagam?" e passou a ser "eles ficam?".** Churn é a métrica número um.
