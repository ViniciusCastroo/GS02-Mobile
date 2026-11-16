/**
 * Cliente da API do Rota Seca (contrato no README):
 * - GET /cruzamentos
 * - GET /risco?local={id}[&em=]
 * - GET /risco?locais={id1},{id2}[&em=]
 * Com USE_MOCK = true, as mesmas chamadas são respondidas por src/api/mock.ts.
 */
import { API_URL, TEMPO_LIMITE_REQUISICAO_MS, USAR_LOTE, USE_MOCK } from '../config';
import {
  lerErroApi,
  montarUrlCruzamentos,
  montarUrlRisco,
  validarCruzamentos,
  validarLoteRisco,
  type CruzamentoApi,
  type LoteRisco,
} from '../domain/contrato';
import { validarRespostaRisco } from '../domain/risco';
import { obterReplay } from '../state/replay';
import type { RiscoResposta } from '../types';
import { ErroMock, mockCruzamentos, mockRisco, mockRiscos } from './mock';

/** Sem internet, tempo esgotado ou servidor fora do ar (5xx): o app usa o cache. */
export class ErroConexao extends Error {
  constructor(mensagem = 'Sem conexão com o serviço de previsão') {
    super(mensagem);
    this.name = 'ErroConexao';
  }
}

/** A API respondeu, mas recusou o pedido (4xx), ex.: local_nao_encontrado. */
export class ErroApiResposta extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroApiResposta';
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simula a rede no mock: atraso, falta de internet e os mesmos erros da API. */
async function noMock<T>(responder: () => T): Promise<T> {
  await esperar(400);
  if (obterReplay().semConexao) throw new ErroConexao();
  try {
    return responder();
  } catch (e) {
    if (e instanceof ErroMock) throw new ErroApiResposta(e.status, e.codigo, e.message);
    throw e;
  }
}

async function buscarJson(url: string): Promise<unknown> {
  // "Simular sem internet" (tela Como funciona) também vale com a API real.
  if (obterReplay().semConexao) throw new ErroConexao();
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_REQUISICAO_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
  } catch {
    throw new ErroConexao();
  } finally {
    clearTimeout(timer);
  }
  const corpo = await res.json().catch(() => null);
  if (res.status >= 500) throw new ErroConexao(`O serviço está fora do ar (${res.status})`);
  if (!res.ok) {
    const erro = lerErroApi(corpo);
    throw new ErroApiResposta(res.status, erro?.codigo ?? 'erro', erro?.mensagem ?? `Erro ${res.status}`);
  }
  return corpo;
}

/** GET /cruzamentos */
export async function buscarCruzamentos(): Promise<CruzamentoApi[]> {
  if (USE_MOCK) return noMock(mockCruzamentos);
  return validarCruzamentos(await buscarJson(montarUrlCruzamentos(API_URL)));
}

/** GET /risco?locais=a,b[&em=] */
export async function buscarRiscos(locais: string[], em?: string): Promise<LoteRisco> {
  if (USE_MOCK) return noMock(() => mockRiscos(locais, em));
  return validarLoteRisco(await buscarJson(montarUrlRisco(API_URL, { locais, em })));
}

async function buscarUm(localId: string, em?: string): Promise<RiscoResposta> {
  if (USE_MOCK) return noMock(() => mockRisco(localId, em));
  return validarRespostaRisco(await buscarJson(montarUrlRisco(API_URL, { local: localId, em })));
}

/* ------------------------------ lote ------------------------------ */

interface Pedido {
  localId: string;
  resolver: (r: RiscoResposta) => void;
  rejeitar: (e: unknown) => void;
}

/** Pedidos esperando para sair juntos, agrupados pelo valor de em. */
const fila = new Map<string, Pedido[]>();
const JANELA_LOTE_MS = 30;

async function enviarLote(em: string) {
  const pedidos = fila.get(em) ?? [];
  fila.delete(em);
  const ids = [...new Set(pedidos.map((p) => p.localId))];
  if (ids.length === 1) {
    // Um só cruzamento: usa a chamada simples.
    buscarUm(ids[0], em || undefined).then(
      (r) => pedidos.forEach((p) => p.resolver(r)),
      (e) => pedidos.forEach((p) => p.rejeitar(e)),
    );
    return;
  }
  try {
    const lote = await buscarRiscos(ids, em || undefined);
    for (const p of pedidos) {
      const r = lote.riscos.find((x) => x.local_id === p.localId);
      if (r) p.resolver(r);
      else p.rejeitar(new ErroApiResposta(404, 'local_nao_encontrado', `Cruzamento '${p.localId}' não existe.`));
    }
  } catch (e) {
    pedidos.forEach((p) => p.rejeitar(e));
  }
}

/**
 * Previsão de um cruzamento (GET /risco?local=). Com USAR_LOTE, pedidos feitos
 * ao mesmo tempo (ex.: vários lugares na tela) viram uma só chamada /risco?locais=.
 */
export function buscarRisco(localId: string, em?: string): Promise<RiscoResposta> {
  if (!USAR_LOTE) return buscarUm(localId, em);
  const chave = em ?? '';
  return new Promise((resolver, rejeitar) => {
    const pedidos = fila.get(chave);
    if (pedidos) pedidos.push({ localId, resolver, rejeitar });
    else {
      fila.set(chave, [{ localId, resolver, rejeitar }]);
      setTimeout(() => enviarLote(chave), JANELA_LOTE_MS);
    }
  });
}
