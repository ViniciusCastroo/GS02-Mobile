# Rota Seca

## Ficha da CitizenTech

| Campo | Conteúdo |
|---|---|
| **Nome** | Rota Seca |
| **Cidade** | São Paulo, SP |
| **Cidadão beneficiado** | Quem se desloca na chuva a pé, de moto, de bicicleta ou de ônibus |
| **Problema** | Ninguém sabe, antes de sair, se o caminho vai alagar |
| **Como funciona** | Estimativa horária por cruzamento, aviso acima de 1,083%, bloqueio só com confirmação do CGE |
| **ODS** | 11 (meta 11.5) e 13 (meta 13.1) |
| **Link do repositório** | [a preencher] |

Global Solution FIAP — disciplina **Mobile Development & IoT**.

**Integrantes:** [a preencher]

---

## O que o app faz

O Rota Seca avisa quando a chuva pode alagar os lugares que a pessoa frequenta em São Paulo e mostra rotas que desviam do alagamento. Um modelo de ML (feito por outro integrante) estima a chance de o CGE registrar um novo alagamento em um cruzamento na próxima hora.

Regras do produto implementadas:

- A previsão é horária. O app consulta a API **a cada 15 minutos** e sempre mostra “Previsão das HH:MM, válida até HH:MM” e “Atualizado às HH:MM”.
- Estimativa **acima de 1,083% (0.01083)** → “Risco elevado”. Igual ou abaixo → “Normal”.
- A rota só é **bloqueada** quando o CGE confirma (`confirmado_cge = true`). A previsão sozinha gera **aviso**, nunca bloqueio.
- O estudo cobre só 4 cruzamentos. Fora deles, ou sem chuva medida → “Sem estimativa”.
- Demonstração com o caso real de **16/01/2025**: aviso às 18:00 no cruzamento Av. das Nações Unidas × R. Jaime de Oliveira Souza e alagamento registrado pelo CGE às 18:48 (selo “Demonstração: replay de 16/01/2025”).

## Como rodar

Pré-requisitos: Node.js 20+ e o app **Expo Go** no celular (ou um emulador Android/iOS).

```bash
npm install
npx expo start
```

Leia o QR code com o Expo Go (Android) ou com a câmera (iOS). O banco SQLite funciona no Android e no iOS.

Outros comandos:

```bash
npm test            # testes Jest das regras de negócio (src/domain)
npx tsc --noEmit    # checagem de tipos
```

> **Mapa:** funciona direto no Expo Go. Para gerar um APK/AAB próprio (EAS Build), o Google Maps no Android exige uma chave: adicione `["react-native-maps", { "androidGoogleMapsApiKey": "[a preencher]" }]` em `plugins` no `app.json`. Na web, o app mostra a ilustração no lugar do mapa.

> O arquivo `.npmrc` usa `legacy-peer-deps=true` porque o `jest-expo` traz um `react-dom` com versão de peer diferente da do React do Expo SDK 58. Não afeta o app.

## Como alternar mock / API

Em `src/config.ts`:

```ts
export const API_URL = 'https://[a-preencher-url-da-api]';
export const USE_MOCK = true;   // true = mock local; false = API real (backend de SOA)
export const MODO_DEMO = true;  // replay de 16/01/2025: envia em= e mostra o seletor 18:00/18:48
export const USAR_LOTE = true;  // junta consultas simultâneas em GET /risco?locais=
```

- `USE_MOCK = true`: as chamadas são respondidas por `src/api/mock.ts`, que segue **o mesmo contrato da API** (mesmos endpoints, parâmetros, campos e erros). Assim o app já está pronto: quando o backend existir, basta preencher `API_URL` e trocar para `false`.
- `USE_MOCK = false`: consulta a API real em `API_URL` e valida cada resposta contra o contrato. Falta de internet, tempo esgotado ou erro 5xx → o app mostra a última previsão salva. Erro 4xx (ex.: `local_nao_encontrado`) → mostra o erro.
- `MODO_DEMO = true`: mostra o selo “Demonstração: replay de 16/01/2025”, o seletor 18:00/18:48 (aba Rotas) e “Simular sem internet” (tela Como funciona). Cada consulta de risco leva `em=2025-01-16T18:00:00-03:00` ou `em=2025-01-16T18:48:00-03:00`. Vale tanto para o mock quanto para a API. `false` = dados de agora.

### Contrato da API (resumo)

| Endpoint | Uso no app |
|---|---|
| `GET /cruzamentos` | Ao abrir o app: lista dos 4 cruzamentos (copiada no SQLite para abrir sem internet; sem cópia, vale a lista padrão embutida) |
| `GET /risco?local={id}[&em=]` | Previsão de um cruzamento, a cada 15 min |
| `GET /risco?locais={id1},{id2}[&em=]` | Quando várias telas/lugares pedem ao mesmo tempo, sai uma chamada só |
| `GET /alertas?local={id}&desde={data}` | Opcional, ainda não usado (o histórico é montado no celular) |

Regras que o backend precisa seguir: horários ISO 8601 **com `-03:00`** (nunca `Z`), `estimativa`/`limiar` em fração (`0.01083` = 1,083%), status `elevado` só quando `estimativa > limiar` (maior estrito), ids fixos `nu-jaime`, `cruzamento-2`, `cruzamento-3`, `cruzamento-4`, `confirmado_em` obrigatório quando `confirmado_cge` é `true`, e erros no formato `{ "erro": { "codigo", "mensagem" } }`.

Resposta de `/risco?local=`:

```json
{
  "local_id": "nu-jaime",
  "cruzamento": "Av. das Nações Unidas × R. Jaime de Oliveira Souza",
  "previsao_hora": "2025-01-16T18:00:00-03:00",
  "valida_ate": "2025-01-16T19:00:00-03:00",
  "estimativa": null,
  "limiar": 0.01083,
  "status": "elevado",
  "confirmado_cge": false,
  "confirmado_em": null
}
```

Item de `/cruzamentos`: `id`, `nome`, `nome_curto`, `via` (ou `null`), `bairro` (ou `null`), `latitude`/`longitude` (ou `null`), `placeholder`. Resposta de `/risco?locais=`: `{ "riscos": [...], "nao_encontrados": [...] }`.

Com `em=`, a API responde como teria respondido naquele instante: `18:00` e `18:30` → `elevado`, sem confirmação; `18:48` → `confirmado_cge: true`, `confirmado_em: 18:48`.

## Como testar o replay 18:00 → 18:48

1. Com `MODO_DEMO = true` (mock ou API), abra o app. Na aba **Lugares**, o lugar “Trabalho” (ligado ao cruzamento `nu-jaime`) aparece com **Risco elevado** e a nota “Estimativa [x,xx]% · acima do limiar de 1,083%”; “Casa” e “Casa da vó” aparecem **Sem estimativa** (“Fora dos 4 cruzamentos do estudo”).
2. Toque no cartão “Trabalho” para abrir o **detalhe** (mapa + painel): status, previsão, validade, estimativa, limiar e confirmação do CGE.
3. Abra a aba **Rotas** (precisa de internet). O app calcula rotas reais **Casa → Trabalho** (Estação Autódromo → Shopping SP Market) e desenha no mapa. Com **18:00** (seletor sobre o mapa): “Pela Av. das Nações Unidas” = **Aviso**; “Rota alternativa” (desvio calculado) = **Sem estimativa**. Tempo e distância vêm do OSRM.
4. Toque em **18:48**: o cartão do mapa fica vermelho (“Alagamento na Nações Unidas”), a primeira rota fica **Bloqueada** (riscada e tracejada no mapa, vai para o fim da lista) e a alternativa **Recomendada**. Em Lugares, “Trabalho” mostra “Alagamento confirmado pelo CGE às 18:48”.
5. Troque o modo (**A pé / Moto e bike / Carro e ônibus**) para recalcular, toque em origem ou destino para escolher outro lugar ou **Minha localização**, e use **Ir pela…** para abrir o Google Maps com a rota escolhida.
6. Abra a aba **Histórico**: há dois alertas no grupo “16 jan 2025 · quinta” (18:48 confirmado e 18:00 risco elevado). Trocar o horário de novo não duplica alertas. Toque num alerta para ver o detalhe e use **Ver rotas**.
7. Para testar o modo offline, ligue **Simular sem internet** no fim da tela **Como funciona** (botão “Ajuda” em Lugares): Lugares e Rotas mostram “Opa, ficamos sem conexão” com o último dado salvo e o horário dele, e o Histórico mostra “Você está sem internet”.

## Estrutura de pastas

```
app/                       Telas (Expo Router)
  _layout.tsx              Stack raiz + SQLiteProvider (cria tabelas e seed)
  (tabs)/_layout.tsx       Abas: Lugares, Rotas, Histórico
  (tabs)/index.tsx         Meus Lugares
  (tabs)/rotas.tsx         Rotas (origem → destino, modo, replay)
  (tabs)/historico.tsx     Histórico de alertas (SQLite, offline)
  lugar/[id].tsx           Adicionar/editar lugar ("novo" cria)
  alerta/[id].tsx          Detalhe do alerta
  como-funciona.tsx        Explicação da estimativa, limiar, CGE e fontes
src/
  config.ts                API_URL, USE_MOCK, intervalo de 15 min
  theme.ts                 Cores, tipografia e espaçamentos centralizados
  types.ts                 Tipos (contrato da API, lugares, alertas)
  api/client.ts            /cruzamentos, /risco?local=, /risco?locais= (lote automático)
  api/mock.ts              Servidor falso com o mesmo contrato (replay de 16/01/2025 via em=)
  data/cruzamentos.ts      Lista atual dos cruzamentos (padrão → SQLite → API)
  domain/contrato.ts       URLs e validação das respostas da API
  hooks/useCarregarCruzamentos.ts  Busca /cruzamentos ao abrir e guarda no SQLite
  db/database.ts           expo-sqlite: tabelas, seed, CRUD, alertas, cache
  domain/risco.ts          Regras puras: status, horários, aviso x bloqueio
  domain/lugar.ts          Validação do formulário de lugar
  domain/__tests__/        Testes Jest
  hooks/useRisco.ts        Consulta + atualização a cada 15 min + cache + alertas
  hooks/useRotas.ts        Posições, rotas reais e busca de desvio
  api/rotas.ts             Nominatim (endereço) e OSRM (rotas)
  domain/rota.ts           Geometria, desvio, classificação e link de navegação
  state/replay.ts          Momento do replay e simulação offline
  state/conexao.ts         Aviso global de "sem internet"
  components/              StatusBadge, Card, PrimaryButton, ScreenHeader,
                           EmptyState, ErrorState, LoadingState, Texto, Chips,
                           Segmented, FormField, Mapa, Folha, Rodape, DemoBadge
Rota Seca mobile design/   Design de referência (protótipo v1 e v2 "mapa primeiro")
```

## Banco de dados local (expo-sqlite)

| Tabela | Colunas | Uso |
|---|---|---|
| `lugares` | id, nome, etiqueta, endereco, local_id, dias_horarios, criado_em (+ etiqueta_personalizada, latitude, longitude) | CRUD completo com validação (nome, etiqueta e endereço obrigatórios; nome da etiqueta quando “Personalizada”; horários no formato 09:00). `dias_horarios` guarda os dias e horários em JSON |
| `alertas` | id, local_id, lugar_id, status, previsao_hora, confirmado_cge, criado_em (+ valida_ate, estimativa, confirmado_em) | Gravado quando um lugar salvo fica “elevado” ou é confirmado pelo CGE. `UNIQUE(lugar_id, local_id, previsao_hora, confirmado_cge)` evita duplicar o mesmo horário. As colunas extras deixam o detalhe completo offline |
| `cache_risco` | local_id, json, atualizado_em | Última previsão de cada cruzamento, para funcionar offline |
| `cruzamentos` | id, nome, nome_curto, via, bairro, latitude, longitude, placeholder, ordem, atualizado_em | Cópia de `GET /cruzamentos`, para abrir sem internet |

Seed (só na primeira abertura), com pontos públicos de exemplo dos dois lados do cruzamento, posições do OpenStreetMap:
- **Trabalho** → Shopping SP Market (Av. das Nações Unidas, Vila Géa), ligado a `nu-jaime`.
- **Casa** → Estação Autódromo (CPTM, Cidade Dutra), sem cruzamento.
- **Casa da vó** → `[endereço da casa da vó]` (sem endereço real; ao escolher como destino, o app avisa que não achou o endereço).

Migrações por `PRAGMA user_version`: v1 cria as tabelas, v2 e v3 adicionam as colunas entre parênteses, v4 cria `cruzamentos`. A v3 também troca os endereços placeholder do seed antigo pelos exemplos novos. `latitude/longitude` guardam a posição do endereço para não consultar o Nominatim toda vez (zeradas quando o endereço muda).

## Rotas reais

| Etapa | Como funciona | Onde |
|---|---|---|
| Endereço → posição | Nominatim (OpenStreetMap), limitado à Grande São Paulo; resultado salvo no lugar | `src/api/rotas.ts` (`geocodificar`) |
| Minha localização | `expo-location`, pede permissão só quando a pessoa escolhe essa opção | `src/hooks/useRotas.ts` |
| Rotas, tempo e distância | **Mapbox Directions** quando há chave: carro com o **trânsito de agora** (`mapbox/driving-traffic`), a pé e bicicleta. Sem chave, ou se o Mapbox falhar (chave inválida, limite), usa o **OSRM** aberto (`routing.openstreetmap.de`), com tempo **sem trânsito**. Cada cartão diz “com trânsito agora” ou “sem trânsito”. “Moto e bike” usa o tempo de bicicleta | `src/api/rotas.ts` (`calcularRotas`) |
| Passa pelo cruzamento? | Distância da linha da rota até o cruzamento ≤ 120 m | `src/domain/rota.ts` (`passaPeloPonto`) |
| Rota alternativa | Se todas as rotas passam pelo cruzamento, o app testa pontos de passagem a 600 m, 1 km e 1,5 km dos dois lados do caminho até achar uma que fique a mais de 120 m. Se não achar, avisa | `src/hooks/useRotas.ts`, `src/domain/rota.ts` (`pontosDeDesvio`) |
| Aviso ou bloqueio | A rota que passa pelo cruzamento recebe a situação da previsão (Aviso; Bloqueada só com confirmação do CGE); a que desvia fica Recomendada quando a principal está bloqueada | `src/domain/rota.ts` (`classificarRotas`) |
| Ir pela… | Abre o Google Maps (app ou navegador) com origem, destino, modo e um ponto de passagem para seguir a rota escolhida | `src/domain/rota.ts` (`linkNavegacao`) |

### Tempo com trânsito (Mapbox)

Sem chave, o tempo vem do OSRM e **não considera trânsito**. Ele pode sair bem menor que o do Google Maps no horário de pico (ex.: 19 min no app contra 32 min no Google). Para ter o trânsito de agora:

1. Crie uma conta grátis em https://account.mapbox.com e copie a chave pública padrão (começa com `pk.`). A cota grátis é de 100.000 consultas de rota por mês.
2. Copie `.env.example` para `.env.local` (ignorado pelo git) e preencha `EXPO_PUBLIC_MAPBOX_TOKEN=pk....`.
3. Reinicie com `npx expo start -c`.

A chave fica dentro do app (vai na URL de cada consulta), por isso use só a **pública** (`pk.`), nunca uma secreta (`sk.`). Mesmo com trânsito, o tempo pode não bater exatamente com o Google, porque cada serviço tem os próprios dados de trânsito.

Nominatim e OSRM são gratuitos e não pedem chave, mas pedem uso moderado. Para uso real, troque `GEOCODER_URL` e `ROTAS_URL` em `src/config.ts` por um servidor próprio. O app de mapas pode recalcular o caminho por conta própria.

## Design

O visual segue o protótipo **“Rota Seca · v2 (mapa primeiro)”** da pasta `Rota Seca mobile design/` (abra `Rota Seca v2.dc.html` no navegador): fundo creme, destaque terracota `#C4471D`, fonte **Nunito**, cartões arredondados, mapa no topo com painel por cima no Detalhe e em Rotas. Todos os tokens ficam em `src/theme.ts`.

Ajustes em relação ao protótipo, para seguir as regras do projeto:

- **Sem números inventados:** estimativas (3,4%, 0,38%…), os outros 3 cruzamentos e os alertas antigos do protótipo viraram placeholders (`[x,xx]%`, `[cruzamento 2]`). Tempo e distância das rotas não vêm do protótipo: são calculados de verdade pelo OSRM.
- **Rotas:** “Pela Av. das Nações Unidas” e “Rota alternativa”, como pede o enunciado. As rotas são reais; podem aparecer mais alternativas se o OSRM devolver.
- **Status com ícone:** os selos usam ícone + texto + cor (o protótipo usa só um ponto colorido).
- **Contraste:** a aba ativa usa `#A83C17` e os textos sobre o trilho/mapa usam `#5A4E46` para manter 4.5:1.
- **Fontes de dados:** CGE, INMET e CEMADEN para o risco; OpenStreetMap (Nominatim + OSRM) para endereços e rotas.
- **Mapa:** mapa real (`react-native-maps`: Apple Maps no iOS, Google Maps no Android) centrado no cruzamento, com marcador que muda de ícone e cor conforme o status. Em Rotas, o mapa mostra origem, destino e as rotas (a escolhida em terracota, a bloqueada tracejada em vermelho). Sem coordenada conhecida (lugar fora do estudo ou cruzamentos 2–4), aparece a ilustração.
- **Etiquetas:** as 5 do enunciado (o protótipo traz também “Academia”, que pode ser criada como Personalizada).

## Como cada critério da rubrica é atendido

| Critério | Como é atendido | Onde |
|---|---|---|
| **Telas e navegação** | Expo Router com 3 abas (Lugares, Rotas, Histórico) e telas em stack com botão voltar (lugar, alerta, como funciona). Rotas dinâmicas `lugar/[id]` e `alerta/[id]` | `app/` |
| **Consumo de dados** | Rotas reais via Nominatim + OSRM (veja “Rotas reais”). `GET {API_URL}/risco?local={id}` ou mock, com validação do contrato. Hook `useRisco` com atualização a cada 15 min e estados de carregando, erro de conexão (mostra o cache e quando foi atualizado) e sem estimativa | `src/api/`, `src/hooks/useRisco.ts`, `src/components/RiscoInfo.tsx` |
| **Banco de dados** | expo-sqlite com 3 tabelas, migração por `user_version`, seed, CRUD completo de lugares, histórico de alertas sem duplicar e cache offline | `src/db/database.ts` |
| **Acessibilidade** | `accessibilityLabel`, `accessibilityRole` e `accessibilityHint` em todo elemento tocável; `accessibilityState` nos seletores (fichas, controles segmentados, rotas) e no switch; área de toque mínima 48×48; fonte base 16 (14–15 só em selos e legendas curtas) respeitando o tamanho de fonte do sistema; contraste ≥ 4.5:1 (valores em `src/theme.ts`); status sempre com texto + ícone + cor; mapa ilustrativo com descrição para leitor de tela; linguagem simples | `src/components/`, `src/theme.ts` |
| **Aderência ao problema** | Regras do produto (limiar 1,083%, aviso x bloqueio, 4 cruzamentos, previsão horária) em funções puras testadas; replay real de 16/01/2025; nenhum número inventado (placeholders onde falta dado) | `src/domain/risco.ts`, `src/api/mock.ts` |
| **Documentação** | Este README (ficha, como rodar, mock/API, estrutura, banco, rotas, design, rubrica e placeholders) e comentários no código | `README.md` |

## O que ainda é placeholder

- Os outros 3 cruzamentos do estudo: “[cruzamento 2]”, “[cruzamento 3]”, “[cruzamento 4]” (sem estimativa).
- O valor exato da estimativa do caso de 16/01/2025: `estimativa: null`, exibido como “[x,xx]%”.
- Coordenadas dos cruzamentos 2, 3 e 4 (rotas por eles não são detectadas até isso ser preenchido).
- Endereço da Casa da vó no seed.
- `API_URL`, endereços dos lugares de exemplo, link do repositório, link do vídeo e integrantes.

## Prints das telas

| Meus Lugares | Rotas (18:00) | Rotas (18:48) |
|---|---|---|
| [print a preencher] | [print a preencher] | [print a preencher] |

| Histórico | Detalhe do alerta | Adicionar lugar | Como funciona |
|---|---|---|---|
| [print a preencher] | [print a preencher] | [print a preencher] | [print a preencher] |

## Vídeo

Link do vídeo: [a preencher]

## Fontes de dados

- **CGE** — Centro de Gerenciamento de Emergências Climáticas de São Paulo (registros de alagamentos)
- **INMET** — Instituto Nacional de Meteorologia (chuva)
- **CEMADEN** — Centro Nacional de Monitoramento e Alertas de Desastres Naturais (pluviômetros)
- **OpenStreetMap** (Nominatim) — posição do cruzamento Av. das Nações Unidas × R. Jaime de Oliveira Souza: `-23.6814075, -46.694591` (ponto em comum entre as vias 251265978 e 941850957, Vila Géa)
