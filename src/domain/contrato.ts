/**
 * Contrato da API (pure): montagem das URLs e validação das respostas de
 * /cruzamentos e /risco?locais=. O contrato completo está no README.
 * Testado em src/domain/__tests__/contrato.test.ts.
 */
import type { Cruzamento } from '../data/cruzamentos';
import type { RiscoResposta } from '../types';
import { validarRespostaRisco } from './risco';

/** Item de GET /cruzamentos. */
export interface CruzamentoApi {
  id: string;
  nome: string;
  nome_curto: string;
  via: string | null;
  bairro: string | null;
  latitude: number | null;
  longitude: number | null;
  placeholder: boolean;
}

/** Resposta de GET /risco?locais=… */
export interface LoteRisco {
  riscos: RiscoResposta[];
  nao_encontrados: string[];
}

/** Corpo de erro da API: { "erro": { "codigo", "mensagem" } }. */
export interface ErroApi {
  codigo: string;
  mensagem: string;
}

const texto = (v: unknown): v is string => typeof v === 'string';
const textoOuNulo = (v: unknown) => v === null || texto(v);
const numeroOuNulo = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));

export function validarCruzamentos(json: unknown): CruzamentoApi[] {
  if (!Array.isArray(json) || json.length === 0) throw new Error('Lista de cruzamentos inválida');
  return json.map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    const ok =
      texto(c.id) &&
      c.id.length > 0 &&
      texto(c.nome) &&
      texto(c.nome_curto) &&
      textoOuNulo(c.via) &&
      textoOuNulo(c.bairro) &&
      numeroOuNulo(c.latitude) &&
      numeroOuNulo(c.longitude) &&
      typeof c.placeholder === 'boolean';
    if (!ok) throw new Error('Cruzamento fora do formato esperado');
    return c as unknown as CruzamentoApi;
  });
}

/** Formato da API -> formato usado nas telas. */
export function paraCruzamento(c: CruzamentoApi): Cruzamento {
  return {
    id: c.id,
    nome: c.nome,
    nomeCurto: c.nome_curto,
    via: c.via ?? c.nome_curto,
    bairro: c.bairro,
    placeholder: c.placeholder,
    coordenada:
      c.latitude !== null && c.longitude !== null ? { latitude: c.latitude, longitude: c.longitude } : null,
  };
}

/** Formato das telas -> formato da API (usado pelo mock e pelo cache do banco). */
export function paraCruzamentoApi(c: Cruzamento): CruzamentoApi {
  return {
    id: c.id,
    nome: c.nome,
    nome_curto: c.nomeCurto,
    via: c.placeholder ? null : c.via,
    bairro: c.bairro,
    latitude: c.coordenada?.latitude ?? null,
    longitude: c.coordenada?.longitude ?? null,
    placeholder: c.placeholder,
  };
}

export function validarLoteRisco(json: unknown): LoteRisco {
  const r = (json ?? {}) as Record<string, unknown>;
  if (!Array.isArray(r.riscos) || !Array.isArray(r.nao_encontrados) || !r.nao_encontrados.every(texto)) {
    throw new Error('Resposta da API fora do formato esperado');
  }
  return { riscos: r.riscos.map(validarRespostaRisco), nao_encontrados: r.nao_encontrados as string[] };
}

export function lerErroApi(json: unknown): ErroApi | null {
  const e = (json as { erro?: Record<string, unknown> } | null)?.erro;
  return e && texto(e.codigo) && texto(e.mensagem) ? { codigo: e.codigo, mensagem: e.mensagem } : null;
}

const semBarraFinal = (base: string) => base.replace(/\/+$/, '');

/**
 * GET {base}/risco?local=… ou ?locais=…, com em= opcional.
 * encodeURIComponent troca ":" por %3A e "+" por %2B (o "+" de um fuso
 * positivo chegaria como espaço se fosse enviado cru).
 */
export function montarUrlRisco(base: string, p: { local?: string; locais?: string[]; em?: string }): string {
  const partes: string[] = [];
  if (p.local !== undefined) partes.push(`local=${encodeURIComponent(p.local)}`);
  else if (p.locais) partes.push(`locais=${p.locais.map(encodeURIComponent).join(',')}`);
  if (p.em) partes.push(`em=${encodeURIComponent(p.em)}`);
  return `${semBarraFinal(base)}/risco?${partes.join('&')}`;
}

export function montarUrlCruzamentos(base: string): string {
  return `${semBarraFinal(base)}/cruzamentos`;
}
