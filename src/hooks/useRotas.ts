import * as Location from 'expo-location';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErroConexao } from '../api/client';
import { calcularRotas, ErroEndereco, ErroSemRota, geocodificar } from '../api/rotas';
import type { Coordenada } from '../data/cruzamentos';
import { salvarPosicaoLugar } from '../db/database';
import { passaPeloPonto, pontosDeDesvio, type ModoRota, type RotaCalculada } from '../domain/rota';
import type { Lugar } from '../types';

/** Origem/destino: um lugar salvo ou a localização atual do celular. */
export type PontoTrajeto = { tipo: 'lugar'; lugar: Lugar } | { tipo: 'minha' };

export class ErroLocalizacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroLocalizacao';
  }
}

export interface EstadoRotas {
  rotas: RotaCalculada[];
  origem: Coordenada | null;
  destino: Coordenada | null;
  carregando: boolean;
  /** Mensagem simples do problema, se houver. */
  erro: string | null;
  /** true quando todas as rotas passam pelo cruzamento e nenhum desvio foi encontrado. */
  semDesvio: boolean;
  recarregar: () => void;
}

const chave = (p: PontoTrajeto | null) => (!p ? '' : p.tipo === 'minha' ? 'minha' : `lugar-${p.lugar.id}-${p.lugar.endereco}`);

/** Guarda as rotas já calculadas nesta sessão (trocar o replay não refaz as consultas). */
const memoria = new Map<string, { rotas: RotaCalculada[]; origem: Coordenada; destino: Coordenada; semDesvio: boolean }>();

async function posicaoAtual(): Promise<Coordenada> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new ErroLocalizacao('Para usar "Minha localização", permita o acesso à localização nas configurações.');
  }
  const pos =
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ??
    (await Location.getLastKnownPositionAsync().catch(() => null));
  if (!pos) throw new ErroLocalizacao('Não conseguimos saber onde você está agora. Tente de novo ao ar livre.');
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

function mensagemDeErro(e: unknown, origem: PontoTrajeto, destino: PontoTrajeto): string {
  if (e instanceof ErroEndereco) {
    const lugar = [origem, destino].find((p) => p.tipo === 'lugar' && p.lugar.endereco === e.endereco);
    const nome = lugar && lugar.tipo === 'lugar' ? lugar.lugar.nome : 'um dos lugares';
    return `Não achamos o endereço de "${nome}". Edite o lugar com rua, número e bairro.`;
  }
  if (e instanceof ErroLocalizacao) return e.message;
  if (e instanceof ErroSemRota) return 'Não encontramos um caminho entre esses lugares para este modo.';
  if (e instanceof ErroConexao) return 'Sem conexão: não deu para calcular as rotas agora.';
  return 'Não deu para calcular as rotas agora.';
}

/**
 * Calcula rotas reais entre origem e destino para o modo escolhido.
 * Se todas passarem pelo cruzamento monitorado, tenta desvios por pontos de
 * passagem dos dois lados do caminho até achar um que fique a mais de 120 m.
 */
export function useRotas(
  origem: PontoTrajeto | null,
  destino: PontoTrajeto | null,
  modo: ModoRota,
  cruzamento: Coordenada | null,
): EstadoRotas {
  const db = useSQLiteContext();
  const [estado, setEstado] = useState<Omit<EstadoRotas, 'recarregar'>>({
    rotas: [],
    origem: null,
    destino: null,
    carregando: false,
    erro: null,
    semDesvio: false,
  });
  const ultima = useRef(0);
  const k = `${chave(origem)}|${chave(destino)}|${modo}|${cruzamento ? `${cruzamento.latitude},${cruzamento.longitude}` : ''}`;

  const resolver = useCallback(
    async (p: PontoTrajeto): Promise<Coordenada> => {
      if (p.tipo === 'minha') return posicaoAtual();
      const { lugar } = p;
      if (lugar.latitude != null && lugar.longitude != null) {
        return { latitude: lugar.latitude, longitude: lugar.longitude };
      }
      const c = await geocodificar(lugar.endereco);
      await salvarPosicaoLugar(db, lugar.id, c).catch(() => undefined);
      return c;
    },
    [db],
  );

  const carregar = useCallback(
    async (forcar = false) => {
      if (!origem || !destino) {
        setEstado((s) => ({ ...s, rotas: [], carregando: false, erro: null }));
        return;
      }
      if (chave(origem) === chave(destino)) {
        setEstado((s) => ({ ...s, rotas: [], carregando: false, erro: 'Escolha uma origem diferente do destino.' }));
        return;
      }
      const salvo = !forcar && origem.tipo !== 'minha' ? memoria.get(k) : undefined;
      if (salvo) {
        setEstado({ ...salvo, carregando: false, erro: null });
        return;
      }
      const consulta = ++ultima.current;
      setEstado((s) => ({ ...s, carregando: true, erro: null }));
      try {
        const o = await resolver(origem);
        const d = await resolver(destino);
        const rotas = await calcularRotas(o, d, modo);
        let semDesvio = false;

        if (cruzamento && rotas.every((r) => passaPeloPonto(r.geometria, cruzamento))) {
          let achou = false;
          for (const via of pontosDeDesvio(rotas[0].geometria, cruzamento)) {
            if (consulta !== ultima.current) return;
            const tentativa = await calcularRotas(o, d, modo, via).catch(() => []);
            const livre = tentativa.find((r) => !passaPeloPonto(r.geometria, cruzamento));
            if (livre) {
              rotas.push(livre);
              achou = true;
              break;
            }
          }
          semDesvio = !achou;
        }

        if (consulta !== ultima.current) return;
        const resultado = { rotas, origem: o, destino: d, semDesvio };
        memoria.set(k, resultado);
        setEstado({ ...resultado, carregando: false, erro: null });
      } catch (e) {
        if (consulta !== ultima.current) return;
        setEstado((s) => ({ ...s, rotas: [], carregando: false, erro: mensagemDeErro(e, origem, destino) }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k, resolver],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ...estado, recarregar: () => carregar(true) };
}
