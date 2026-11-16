import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buscarRisco, ErroConexao } from '../api/client';
import { INTERVALO_ATUALIZACAO_MS, MODO_DEMO } from '../config';
import { lerCache, registrarAlertas, salvarCache } from '../db/database';
import { ehCruzamentoCoberto } from '../domain/risco';
import { informarConexao } from '../state/conexao';
import { INSTANTES_REPLAY, useReplay } from '../state/replay';
import type { RiscoResposta } from '../types';

export interface EstadoRisco {
  /** Previsão atual (da API ou, se offline, do cache). */
  dados: RiscoResposta | null;
  carregando: boolean;
  /** Mensagem do erro de conexão, se a última consulta falhou. */
  erro: string | null;
  /** Quando a previsão mostrada foi atualizada (ISO). */
  atualizadoEm: string | null;
  /** true quando "dados" veio do cache porque a consulta falhou. */
  doCache: boolean;
  /** true quando o lugar não está em um dos 4 cruzamentos do estudo. */
  semCobertura: boolean;
  recarregar: () => void;
}

/**
 * Consulta o risco de um cruzamento e atualiza a cada 15 minutos.
 * - salva cada resposta no cache_risco (para funcionar offline);
 * - em erro de conexão, mostra a última previsão salva e quando foi atualizada;
 * - grava alertas no histórico quando o status fica elevado ou o CGE confirma.
 */
export function useRisco(localId: string | null | undefined): EstadoRisco {
  const db = useSQLiteContext();
  const { momento, semConexao } = useReplay();
  const coberto = ehCruzamentoCoberto(localId);
  // Na demonstração, pede à API a situação do momento escolhido no replay (em=).
  const em = MODO_DEMO ? INSTANTES_REPLAY[momento] : undefined;

  const [dados, setDados] = useState<RiscoResposta | null>(null);
  const [carregando, setCarregando] = useState(coberto);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [doCache, setDoCache] = useState(false);
  const montado = useRef(true);
  // Ignora respostas atrasadas quando o momento do replay muda no meio de uma consulta.
  const ultimaConsulta = useRef(0);

  const carregar = useCallback(async () => {
    if (!localId || !coberto) {
      setDados(null);
      setCarregando(false);
      setErro(null);
      return;
    }
    const consulta = ++ultimaConsulta.current;
    const vigente = () => montado.current && consulta === ultimaConsulta.current;
    setCarregando(true);
    try {
      const resposta = await buscarRisco(localId, em);
      informarConexao(true);
      if (!vigente()) return;
      const quando = await salvarCache(db, resposta);
      await registrarAlertas(db, resposta);
      if (!vigente()) return;
      setDados(resposta);
      setAtualizadoEm(quando);
      setErro(null);
      setDoCache(false);
    } catch (e) {
      // Só falta de internet / servidor fora do ar conta como "sem conexão".
      if (e instanceof ErroConexao) informarConexao(false);
      const cache = await lerCache(db, localId).catch(() => null);
      if (!vigente()) return;
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar a previsão');
      setDados(cache?.resposta ?? null);
      setAtualizadoEm(cache?.atualizado_em ?? null);
      setDoCache(!!cache);
    } finally {
      if (vigente()) setCarregando(false);
    }
  }, [db, localId, coberto, em]);

  // Consulta ao abrir, ao trocar o momento do replay e a cada 15 minutos.
  useEffect(() => {
    montado.current = true;
    carregar();
    const timer = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => {
      montado.current = false;
      clearInterval(timer);
    };
  }, [carregar, momento, semConexao]);

  return {
    dados,
    carregando,
    erro,
    atualizadoEm,
    doCache,
    semCobertura: !coberto,
    recarregar: carregar,
  };
}
