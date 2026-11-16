/**
 * Tema centralizado do Rota Seca — segue o design "Rota Seca · v2 (mapa primeiro)"
 * (pasta "Rota Seca mobile design"). Troque os valores aqui e todas as telas acompanham.
 *
 * Contraste (WCAG) dos pares texto/fundo usados, todos ≥ 4.5:1:
 * - texto #2B2420 / fundo #FBF5EC ............ 14.08
 * - textoSecundario #5A4E46 / #FBF5EC ......... 7.41  (/ #FFFFFF 8.04, / trilho 6.65, / mapa 6.09)
 * - textoTerciario #75685E / #FFFFFF .......... 5.39  (/ #FBF5EC 4.97) — nunca sobre o trilho
 * - destaque #C4471D / #FFFFFF ................ 4.92  (/ #FBF5EC 4.54, / #FFF4EC 4.55)
 * - branco / destaque #C4471D ................. 4.92
 * - destaqueForte #A83C17 / destaqueSuave ..... 5.13  (aba ativa)
 * - aviso #6B4500 / #FBE7B5 ................... 6.95
 * - normal #1E5A35 / #DCEFE2 .................. 6.81
 * - semEstimativa #55585D / #F1EAE0 ........... 5.98
 * - bloqueado #8A1F12 / #F9D9D4 ............... 6.96
 * - branco / recomendada #24663D .............. 6.90
 * - branco / bloqueadoForte #B3261E ........... 6.54
 * - #E9DFD6 / escuro #2B2420 .................. 11.62
 */
export const cores = {
  fundo: '#FBF5EC',
  superficie: '#FFFFFF',
  texto: '#2B2420',
  textoCorpo: '#4A3F38',
  textoSecundario: '#5A4E46',
  textoTerciario: '#75685E',

  destaque: '#C4471D',
  destaqueForte: '#A83C17',
  destaqueSuave: '#FBE3D6',
  destaqueFundo: '#FFF4EC',
  textoSobreDestaque: '#FFFFFF',

  borda: '#E8D9C5',
  bordaSuave: '#F0E4D4',
  divisoria: '#F5ECE0',
  tracejado: '#E0BFA3',
  trilho: '#F3E8DA',
  esqueleto: '#F1EAE0',
  esqueletoClaro: '#F6F0E8',
  mapa: '#EADFCC',
  mapaRua: '#F7F0E4',

  escuro: '#2B2420',
  textoSobreEscuro: '#FFFFFF',
  textoSobreEscuroSuave: '#E9DFD6',

  aviso: '#6B4500',
  avisoFundo: '#FBE7B5',
  avisoPonto: '#C98500',
  normal: '#1E5A35',
  normalFundo: '#DCEFE2',
  normalPonto: '#2E7D4A',
  semEstimativa: '#55585D',
  semEstimativaFundo: '#F1EAE0',
  semEstimativaPonto: '#9A9DA1',
  bloqueado: '#8A1F12',
  bloqueadoFundo: '#F9D9D4',
  bloqueadoForte: '#B3261E',
  recomendada: '#FFFFFF',
  recomendadaFundo: '#24663D',

  sombra: '#2B2420',
} as const;

/** Família Nunito (cada peso é um arquivo de fonte). */
export const fontes = {
  regular: 'Nunito_400Regular',
  medio: 'Nunito_500Medium',
  semi: 'Nunito_600SemiBold',
  negrito: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
} as const;

/**
 * Tamanhos de fonte. A base é 16; 14–15 só em legendas curtas (selos, rótulos de abas).
 * O app respeita o tamanho de fonte do sistema (allowFontScaling nunca é desligado).
 */
export const tipografia = {
  legenda: 14,
  pequeno: 15,
  base: 16,
  corpo: 17,
  medio: 18,
  destaque: 20,
  titulo: 24,
  numero: 26,
  tituloGrande: 28,
  alturaLinha: 1.45,
} as const;

export const espacos = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  tela: 20,
} as const;

export const raio = {
  sm: 14,
  md: 16,
  lg: 22,
  xl: 24,
  folha: 28,
  pilula: 999,
} as const;

/** Área mínima de toque (48×48). */
export const TOQUE_MINIMO = 48;

export const sombra = {
  leve: {
    shadowColor: cores.sombra,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  folha: {
    shadowColor: cores.sombra,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
} as const;

export const tema = { cores, fontes, tipografia, espacos, raio, sombra, TOQUE_MINIMO };
export default tema;
