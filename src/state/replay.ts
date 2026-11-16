/**
 * Estado compartilhado da demonstração (replay de 16/01/2025).
 * Guardado em memória: qualquer tela pode ler e trocar o momento do replay.
 */
import { useSyncExternalStore } from 'react';
import type { MomentoReplay } from '../types';

interface EstadoReplay {
  momento: MomentoReplay;
  /** Simula falta de internet para testar o cache offline. */
  semConexao: boolean;
}

/** Instante enviado no parâmetro em= da API para cada momento do replay. */
export const INSTANTES_REPLAY: Record<MomentoReplay, string> = {
  '18:00': '2025-01-16T18:00:00-03:00',
  '18:48': '2025-01-16T18:48:00-03:00',
};

let estado: EstadoReplay = { momento: '18:00', semConexao: false };
const ouvintes = new Set<() => void>();

export function obterReplay(): EstadoReplay {
  return estado;
}

function atualizar(parcial: Partial<EstadoReplay>) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((o) => o());
}

export function definirMomento(momento: MomentoReplay) {
  atualizar({ momento });
}

export function definirSemConexao(semConexao: boolean) {
  atualizar({ semConexao });
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useReplay(): EstadoReplay {
  return useSyncExternalStore(assinar, obterReplay, obterReplay);
}
