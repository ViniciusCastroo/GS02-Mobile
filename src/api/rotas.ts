/**
 * Rotas reais: endereço -> posição (Nominatim) e rotas (Mapbox, com trânsito
 * no carro; ou OSRM, sem trânsito, quando não há chave ou o Mapbox falha).
 * Nada aqui inventa número: tempo e distância vêm do serviço que calculou.
 */
import { GEOCODER_URL, IDENTIFICACAO_APP, MAPBOX_TOKEN, MAPBOX_URL, ROTAS_URL } from '../config';
import type { Coordenada } from '../data/cruzamentos';
import type { ModoRota, RotaCalculada } from '../domain/rota';
import { ErroConexao } from './client';

export class ErroEndereco extends Error {
  constructor(public endereco: string) {
    super(`Não achamos o endereço "${endereco}"`);
    this.name = 'ErroEndereco';
  }
}

export class ErroSemRota extends Error {
  constructor() {
    super('Não encontramos um caminho entre esses lugares');
    this.name = 'ErroSemRota';
  }
}

const TEMPO_LIMITE_MS = 15000;

async function buscarJson(url: string): Promise<unknown> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const res = await fetch(url, {
      signal: controle.signal,
      headers: { Accept: 'application/json', 'User-Agent': IDENTIFICACAO_APP },
    });
    if (!res.ok) throw new ErroConexao(`O serviço de rotas respondeu com erro (${res.status})`);
    return await res.json();
  } catch (e) {
    if (e instanceof ErroConexao) throw e;
    throw new ErroConexao('Sem conexão com o serviço de rotas');
  } finally {
    clearTimeout(timer);
  }
}

/** Limita a busca à região metropolitana de São Paulo. */
const CAIXA_SP = '-47.10,-23.35,-46.30,-24.05';

/** Endereço -> posição, usando o Nominatim (OpenStreetMap). */
export async function geocodificar(endereco: string): Promise<Coordenada> {
  const limpo = endereco.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (limpo.length < 4) throw new ErroEndereco(endereco);
  const q = /s[aã]o paulo/i.test(limpo) ? limpo : `${limpo}, São Paulo`;
  const url =
    `${GEOCODER_URL}?format=json&limit=1&countrycodes=br&bounded=1` +
    `&viewbox=${CAIXA_SP}&q=${encodeURIComponent(q)}`;
  const json = (await buscarJson(url)) as { lat?: string; lon?: string }[];
  const r = Array.isArray(json) ? json[0] : undefined;
  const latitude = Number(r?.lat);
  const longitude = Number(r?.lon);
  if (!r || Number.isNaN(latitude) || Number.isNaN(longitude)) throw new ErroEndereco(endereco);
  return { latitude, longitude };
}

const PERFIL: Record<ModoRota, string> = {
  a_pe: 'routed-foot',
  // Moto e bike usam o perfil de bicicleta (o mais próximo disponível no OSRM aberto).
  moto_bike: 'routed-bike',
  carro_onibus: 'routed-car',
};

interface RespostaOsrm {
  code: string;
  routes?: { duration: number; distance: number; geometry: { coordinates: [number, number][] } }[];
}

const ponto = (c: Coordenada) => `${c.longitude.toFixed(6)},${c.latitude.toFixed(6)}`;

/** Rotas pelo OSRM (sem trânsito). */
export async function calcularRotasOsrm(
  origem: Coordenada,
  destino: Coordenada,
  modo: ModoRota,
  via?: Coordenada,
): Promise<RotaCalculada[]> {
  const pontos = [origem, ...(via ? [via] : []), destino].map(ponto).join(';');
  const url =
    `${ROTAS_URL}/${PERFIL[modo]}/route/v1/driving/${pontos}` +
    `?overview=full&geometries=geojson&steps=false${via ? '' : '&alternatives=2'}`;
  const json = (await buscarJson(url)) as RespostaOsrm;
  if (json.code !== 'Ok' || !json.routes?.length) {
    if (json.code === 'NoRoute' || json.code === 'Ok') throw new ErroSemRota();
    throw new ErroConexao(`O serviço de rotas não respondeu direito (${json.code})`);
  }
  return json.routes.map((r, i) => ({
    id: `${via ? `via-${ponto(via)}` : 'direta'}-${i}`,
    geometria: r.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    duracao_s: r.duration,
    distancia_m: r.distance,
    via,
    fonte: 'osrm' as const,
    comTransito: false,
  }));
}

const PERFIL_MAPBOX: Record<ModoRota, string> = {
  a_pe: 'mapbox/walking',
  moto_bike: 'mapbox/cycling',
  // driving-traffic considera o trânsito atual e o histórico.
  carro_onibus: 'mapbox/driving-traffic',
};

class ErroMapbox extends Error {}

/** Rotas pelo Mapbox Directions (com trânsito no carro). */
export async function calcularRotasMapbox(
  origem: Coordenada,
  destino: Coordenada,
  modo: ModoRota,
  via?: Coordenada,
): Promise<RotaCalculada[]> {
  const pontos = [origem, ...(via ? [via] : []), destino].map(ponto).join(';');
  const url =
    `${MAPBOX_URL}/${PERFIL_MAPBOX[modo]}/${pontos}` +
    `?alternatives=${via ? 'false' : 'true'}&geometries=geojson&overview=full&steps=false` +
    `&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let json: RespostaOsrm;
  try {
    const res = await fetch(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
    json = (await res.json().catch(() => ({ code: `HTTP ${res.status}` }))) as RespostaOsrm;
    // 401/403: chave inválida; 429: limite; outros: falha do serviço.
    if (!res.ok && json.code !== 'NoRoute') throw new ErroMapbox(`Mapbox respondeu ${res.status}`);
  } catch (e) {
    if (e instanceof ErroMapbox) throw e;
    throw new ErroConexao('Sem conexão com o serviço de rotas');
  } finally {
    clearTimeout(timer);
  }
  if (json.code === 'NoRoute' || json.code === 'NoSegment') throw new ErroSemRota();
  if (json.code !== 'Ok' || !json.routes?.length) throw new ErroMapbox(`Mapbox: ${json.code}`);
  return json.routes.map((r, i) => ({
    id: `mb-${via ? `via-${ponto(via)}` : 'direta'}-${i}`,
    geometria: r.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    duracao_s: r.duration,
    distancia_m: r.distance,
    via,
    fonte: 'mapbox' as const,
    comTransito: modo === 'carro_onibus',
  }));
}

/**
 * Rotas entre origem e destino (com até 2 alternativas), opcionalmente passando por `via`.
 * Usa o Mapbox quando há chave; se ele falhar por chave, limite ou erro do serviço,
 * cai no OSRM. Sem internet nenhum dos dois funciona, e o erro sobe.
 */
export async function calcularRotas(
  origem: Coordenada,
  destino: Coordenada,
  modo: ModoRota,
  via?: Coordenada,
): Promise<RotaCalculada[]> {
  if (MAPBOX_TOKEN) {
    try {
      return await calcularRotasMapbox(origem, destino, modo, via);
    } catch (e) {
      if (e instanceof ErroSemRota || e instanceof ErroConexao) throw e;
      // ErroMapbox: segue para o OSRM.
    }
  }
  return calcularRotasOsrm(origem, destino, modo, via);
}
