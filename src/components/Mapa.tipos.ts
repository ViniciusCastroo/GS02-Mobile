import type { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import type { Coordenada } from '../data/cruzamentos';

export interface PontoMapa {
  coordenada: Coordenada;
  titulo: string;
  /** Cor do ícone e da borda do marcador. */
  cor: string;
  fundo: string;
  icone: keyof typeof Ionicons.glyphMap;
}

export interface LinhaMapa {
  id: string;
  coordenadas: Coordenada[];
  cor: string;
  largura: number;
  tracejada?: boolean;
  /** Desenhada por cima das outras. */
  destaque?: boolean;
}

export interface PropsMapa {
  altura: number;
  /** Descrição do mapa para o leitor de tela. */
  descricao: string;
  /** Cruzamento a destacar. Sem ponto (e sem linhas), mostra a ilustração com a legenda. */
  ponto?: PontoMapa | null;
  /** Outros marcadores (ex.: origem e destino). */
  marcadores?: PontoMapa[];
  /** Rotas desenhadas no mapa. */
  linhas?: LinhaMapa[];
  /** Espaço livre (px) no topo para os cartões que ficam por cima do mapa. */
  margemTopo?: number;
  legenda?: string;
  /**
   * Quanto o cruzamento fica abaixo do centro (0 = centro, 0.3 = bem abaixo),
   * quando não há linhas para enquadrar.
   */
  deslocamento?: number;
  /** Elementos por cima do mapa (cartões, botões). */
  children?: ReactNode;
}
