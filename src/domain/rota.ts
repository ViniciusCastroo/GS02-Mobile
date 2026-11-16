/**
 * Regras puras das rotas: geometria (distâncias), se a rota passa pelo
 * cruzamento, pontos de desvio, classificação aviso/bloqueio e formatação.
 * Testadas em src/domain/__tests__/rota.test.ts.
 */
import type { Coordenada } from '../data/cruzamentos';
import type { RiscoResposta, SituacaoRota } from '../types';
import { formatarHora, situacaoRotaAlternativa, situacaoRotaPrincipal } from './risco';

/** Uma rota "passa pelo cruzamento" se chega a menos de 120 m dele. */
export const RAIO_CRUZAMENTO_M = 120;

/** Distâncias (em metros) dos pontos de desvio, testados um de cada lado do caminho. */
export const DISTANCIAS_DESVIO_M = [600, 1000, 1500];

export type ModoRota = 'a_pe' | 'moto_bike' | 'carro_onibus';

export interface RotaCalculada {
  id: string;
  geometria: Coordenada[];
  duracao_s: number;
  distancia_m: number;
  /** Ponto de passagem usado para forçar o desvio (se houver). */
  via?: Coordenada;
  /** Serviço que calculou a rota. */
  fonte: 'mapbox' | 'osrm';
  /** true quando o tempo considera o trânsito de agora (Mapbox, carro). */
  comTransito: boolean;
}

export interface RotaClassificada extends RotaCalculada {
  nome: string;
  situacao: SituacaoRota;
  nota: string;
  passaPeloCruzamento: boolean;
}

const RAIO_TERRA_M = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância em linha reta entre dois pontos (fórmula de haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.sqrt(h));
}

/** Converte para metros num plano local centrado em `origem` (bom para poucos km). */
function paraMetros(p: Coordenada, origem: Coordenada) {
  const k = (Math.PI / 180) * RAIO_TERRA_M;
  return {
    x: (p.longitude - origem.longitude) * k * Math.cos(rad(origem.latitude)),
    y: (p.latitude - origem.latitude) * k,
  };
}

function deMetros(x: number, y: number, origem: Coordenada): Coordenada {
  const k = (Math.PI / 180) * RAIO_TERRA_M;
  return {
    latitude: origem.latitude + y / k,
    longitude: origem.longitude + x / (k * Math.cos(rad(origem.latitude))),
  };
}

/** Menor distância de `p` até o segmento a–b, em metros. */
export function distanciaAteSegmento(p: Coordenada, a: Coordenada, b: Coordenada): number {
  const A = paraMetros(a, p);
  const B = paraMetros(b, p);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const comp2 = dx * dx + dy * dy;
  const t = comp2 === 0 ? 0 : Math.max(0, Math.min(1, -(A.x * dx + A.y * dy) / comp2));
  return Math.hypot(A.x + t * dx, A.y + t * dy);
}

/** Menor distância de `p` até a linha da rota, e em qual trecho isso acontece. */
export function menorDistancia(geometria: Coordenada[], p: Coordenada): { metros: number; trecho: number } {
  if (geometria.length === 0) return { metros: Infinity, trecho: -1 };
  if (geometria.length === 1) return { metros: distanciaMetros(geometria[0], p), trecho: 0 };
  let melhor = { metros: Infinity, trecho: 0 };
  for (let i = 0; i < geometria.length - 1; i++) {
    const d = distanciaAteSegmento(p, geometria[i], geometria[i + 1]);
    if (d < melhor.metros) melhor = { metros: d, trecho: i };
  }
  return melhor;
}

export function passaPeloPonto(geometria: Coordenada[], p: Coordenada, raio = RAIO_CRUZAMENTO_M): boolean {
  return menorDistancia(geometria, p).metros <= raio;
}

/**
 * Pontos de passagem para tentar um desvio: perpendiculares ao caminho no
 * cruzamento, alternando os dois lados (600 m, 1 km, 1,5 km). O serviço de
 * rotas "gruda" cada ponto na rua mais próxima.
 */
export function pontosDeDesvio(
  geometria: Coordenada[],
  cruzamento: Coordenada,
  distancias: number[] = DISTANCIAS_DESVIO_M,
): Coordenada[] {
  const { trecho } = menorDistancia(geometria, cruzamento);
  if (trecho < 0 || geometria.length < 2) return [];
  const a = paraMetros(geometria[trecho], cruzamento);
  const b = paraMetros(geometria[Math.min(trecho + 1, geometria.length - 1)], cruzamento);
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const comp = Math.hypot(dx, dy);
  if (comp === 0) {
    dx = 0;
    dy = 1;
  } else {
    dx /= comp;
    dy /= comp;
  }
  const [px, py] = [-dy, dx]; // perpendicular
  const pontos: Coordenada[] = [];
  for (const d of distancias) {
    pontos.push(deMetros(px * d, py * d, cruzamento));
    pontos.push(deMetros(-px * d, -py * d, cruzamento));
  }
  return pontos;
}

/** Ponto do meio da rota (usado para "guiar" o app de mapas pela mesma rota). */
export function pontoDoMeio(geometria: Coordenada[]): Coordenada | null {
  if (geometria.length === 0) return null;
  return geometria[Math.floor(geometria.length / 2)];
}

/** "8 min", "59 min", "1 h 05 min". */
export function formatarDuracao(segundos: number): string {
  const min = Math.max(1, Math.round(segundos / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')} min`;
}

/** "850 m", "5,4 km", "12 km". */
export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  const km = metros / 1000;
  return `${(km < 10 ? km.toFixed(1) : km.toFixed(0)).replace('.', ',')} km`;
}

/** "com trânsito agora" ou "sem trânsito" — o tempo nunca aparece sem dizer de onde vem. */
export function rotuloTempo(r: Pick<RotaCalculada, 'comTransito'>): string {
  return r.comTransito ? 'com trânsito agora' : 'sem trânsito';
}

/** De onde vêm o tempo e a distância (rodapé da tela). */
export function fonteDasRotas(rotas: Pick<RotaCalculada, 'fonte' | 'comTransito'>[], modo: ModoRota): string {
  const bike = modo === 'moto_bike' ? ' Moto e bike usa o tempo de bicicleta.' : '';
  if (rotas.length > 0 && rotas.every((r) => r.fonte === 'mapbox')) {
    return rotas.some((r) => r.comTransito)
      ? `Tempo com o trânsito de agora. Rotas: Mapbox.${bike}`
      : `Rotas: Mapbox.${bike}`;
  }
  return `Tempo estimado sem trânsito: o real pode ser bem maior no horário de pico. Rotas: OSRM · OpenStreetMap.${bike}`;
}

/** Duração e distância lidas pelo leitor de tela. */
export function descreverMedidas(r: Pick<RotaCalculada, 'duracao_s' | 'distancia_m' | 'comTransito'>): string {
  return `cerca de ${formatarDuracao(r.duracao_s).replace('h', 'hora').replace('min', 'minutos')} ${rotuloTempo(r)}, ${formatarDistancia(r.distancia_m).replace('km', 'quilômetros').replace(' m', ' metros')}`;
}

const MODO_GOOGLE: Record<ModoRota, string> = {
  a_pe: 'walking',
  moto_bike: 'bicycling',
  carro_onibus: 'driving',
};

const coord = (c: Coordenada) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`;

/**
 * Link do Google Maps (abre o app, se instalado, ou o navegador) com origem,
 * destino, modo e um ponto de passagem para seguir a rota escolhida.
 */
export function linkNavegacao(origem: Coordenada, destino: Coordenada, modo: ModoRota, via?: Coordenada | null): string {
  const params = [
    'api=1',
    `origin=${coord(origem)}`,
    `destination=${coord(destino)}`,
    `travelmode=${MODO_GOOGLE[modo]}`,
  ];
  if (via) params.push(`waypoints=${coord(via)}`);
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}

/**
 * Dá nome, situação e nota a cada rota:
 * - rota que passa pelo cruzamento -> Aviso / Bloqueada / Normal / Sem estimativa (conforme a previsão);
 * - rota que não passa -> "Rota alternativa": Recomendada quando a principal está bloqueada,
 *   senão Sem estimativa (não passa pelos cruzamentos do estudo).
 * Ordem: a mais rápida primeiro; se a principal estiver bloqueada, as livres sobem.
 */
export function classificarRotas(
  rotas: RotaCalculada[],
  cruzamento: { coordenada: Coordenada; nomeCurto: string; via: string } | null,
  risco: RiscoResposta | null,
): RotaClassificada[] {
  const passa = (r: RotaCalculada) => !!cruzamento && passaPeloPonto(r.geometria, cruzamento.coordenada);
  const situacaoPrincipal = situacaoRotaPrincipal(risco);
  const algumaPassa = rotas.some(passa);
  const hora = risco?.confirmado_em ? ` às ${formatarHora(risco.confirmado_em)}` : '';
  const nomeCruz = cruzamento?.nomeCurto ?? '';

  const notasPrincipal: Record<SituacaoRota, string> = {
    bloqueada: `Alagamento confirmado pelo CGE${hora} em ${nomeCruz}.`,
    aviso: `Passa por ${nomeCruz}, com risco elevado na próxima hora. Ainda liberada.`,
    normal: `Passa por ${nomeCruz}. Sem risco elevado na próxima hora.`,
    sem_estimativa: `Passa por ${nomeCruz}, mas não há estimativa agora.`,
    recomendada: '',
  };

  let contAlt = 0;
  const classificadas = [...rotas]
    .sort((a, b) => a.duracao_s - b.duracao_s)
    .map((r): RotaClassificada => {
      if (passa(r)) {
        return {
          ...r,
          nome: `Pela ${cruzamento!.via}`,
          situacao: situacaoPrincipal,
          nota: notasPrincipal[situacaoPrincipal],
          passaPeloCruzamento: true,
        };
      }
      contAlt += 1;
      const situacao = algumaPassa ? situacaoRotaAlternativa(situacaoPrincipal) : 'sem_estimativa';
      return {
        ...r,
        nome: contAlt === 1 ? 'Rota alternativa' : `Rota alternativa ${contAlt}`,
        situacao,
        nota:
          situacao === 'recomendada'
            ? `Desvia de ${nomeCruz}. É o melhor caminho agora.`
            : algumaPassa
              ? `Desvia de ${nomeCruz}.`
              : 'Não passa por cruzamentos do estudo.',
        passaPeloCruzamento: false,
      };
    });

  return situacaoPrincipal === 'bloqueada'
    ? [...classificadas.filter((r) => r.situacao !== 'bloqueada'), ...classificadas.filter((r) => r.situacao === 'bloqueada')]
    : classificadas;
}
