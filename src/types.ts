export type StatusRisco = 'elevado' | 'normal' | 'sem_estimativa';

/** Resposta de GET {API_URL}/risco?local={id} */
export interface RiscoResposta {
  local_id: string;
  cruzamento: string;
  previsao_hora: string;
  valida_ate: string;
  estimativa: number | null;
  limiar: number;
  status: StatusRisco;
  confirmado_cge: boolean;
  confirmado_em: string | null;
}

export const ETIQUETAS = ['Casa', 'Trabalho', 'Faculdade', 'Casa da vó', 'Personalizada'] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

export interface Lugar {
  id: number;
  nome: string;
  etiqueta: Etiqueta;
  /** Nome da etiqueta quando etiqueta = "Personalizada". */
  etiqueta_personalizada: string | null;
  endereco: string;
  local_id: string | null;
  /** Rotina salva como JSON: {"dias":[1,2,3],"chegada":"09:00","saida":"18:30"} */
  dias_horarios: string;
  /** Posição do endereço (v3), guardada para não buscar de novo. null = ainda não buscada. */
  latitude: number | null;
  longitude: number | null;
  criado_em: string;
}

export type LugarEntrada = Omit<Lugar, 'id' | 'criado_em' | 'latitude' | 'longitude'> &
  Partial<Pick<Lugar, 'latitude' | 'longitude'>>;

export interface Alerta {
  id: number;
  local_id: string;
  lugar_id: number;
  status: StatusRisco;
  previsao_hora: string;
  confirmado_cge: boolean;
  criado_em: string;
  /** Colunas extras (v2) para mostrar o detalhe mesmo offline. */
  valida_ate: string | null;
  estimativa: number | null;
  confirmado_em: string | null;
}

/** Alerta com dados do lugar, para listar no histórico. */
export interface AlertaComLugar extends Alerta {
  lugar_nome: string | null;
  lugar_etiqueta: string | null;
}

/** Situação de uma rota mostrada ao usuário. */
export type SituacaoRota = 'aviso' | 'bloqueada' | 'normal' | 'recomendada' | 'sem_estimativa';

/** Momentos do replay de demonstração (16/01/2025). */
export type MomentoReplay = '18:00' | '18:48';
