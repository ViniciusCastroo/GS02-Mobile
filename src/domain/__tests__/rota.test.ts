import { MOCK_RISCO } from '../../api/mock';
import type { Coordenada } from '../../data/cruzamentos';
import {
  classificarRotas,
  distanciaAteSegmento,
  distanciaMetros,
  formatarDistancia,
  fonteDasRotas,
  formatarDuracao,
  rotuloTempo,
  linkNavegacao,
  menorDistancia,
  passaPeloPonto,
  pontoDoMeio,
  pontosDeDesvio,
  RAIO_CRUZAMENTO_M,
  type RotaCalculada,
} from '../rota';

const CRUZ: Coordenada = { latitude: -23.6814075, longitude: -46.694591 };
const cruzamento = { coordenada: CRUZ, nomeCurto: 'Nações Unidas × Jaime de Oliveira Souza', via: 'Av. das Nações Unidas' };

/** Linha reta sul -> norte passando a `deslocM` metros a leste do cruzamento. */
function linha(deslocM: number): Coordenada[] {
  const dLon = deslocM / (111320 * Math.cos((CRUZ.latitude * Math.PI) / 180));
  return [
    { latitude: CRUZ.latitude - 0.01, longitude: CRUZ.longitude + dLon },
    { latitude: CRUZ.latitude + 0.01, longitude: CRUZ.longitude + dLon },
  ];
}

const rota = (id: string, deslocM: number, duracao: number): RotaCalculada => ({
  id,
  geometria: linha(deslocM),
  duracao_s: duracao,
  distancia_m: 2200,
  fonte: 'osrm',
  comTransito: false,
});

describe('geometria', () => {
  it('distância entre pontos (haversine)', () => {
    // 0,01° de latitude ≈ 1,11 km
    const d = distanciaMetros(CRUZ, { latitude: CRUZ.latitude + 0.01, longitude: CRUZ.longitude });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1125);
  });
  it('distância até o trecho, não só até os vértices', () => {
    const [a, b] = linha(50);
    // os vértices estão a ~1,1 km, mas a linha passa a 50 m
    expect(distanciaAteSegmento(CRUZ, a, b)).toBeCloseTo(50, 0);
    expect(menorDistancia([a, b], CRUZ).metros).toBeCloseTo(50, 0);
  });
  it('passa pelo cruzamento só dentro do raio de 120 m', () => {
    expect(RAIO_CRUZAMENTO_M).toBe(120);
    expect(passaPeloPonto(linha(50), CRUZ)).toBe(true);
    expect(passaPeloPonto(linha(250), CRUZ)).toBe(false);
    expect(passaPeloPonto([], CRUZ)).toBe(false);
  });
  it('pontos de desvio ficam dos dois lados, na distância pedida', () => {
    const pontos = pontosDeDesvio(linha(0), CRUZ, [600]);
    expect(pontos).toHaveLength(2);
    for (const p of pontos) expect(distanciaMetros(p, CRUZ)).toBeCloseTo(600, -1);
    // perpendicular a uma rota sul-norte = um a leste e outro a oeste
    expect(Math.sign(pontos[0].longitude - CRUZ.longitude)).toBe(-Math.sign(pontos[1].longitude - CRUZ.longitude));
  });
  it('ponto do meio', () => {
    expect(pontoDoMeio([])).toBeNull();
    expect(pontoDoMeio(linha(0))).toEqual(linha(0)[1]);
  });
});

describe('formatação', () => {
  it('duração', () => {
    expect(formatarDuracao(20)).toBe('1 min');
    expect(formatarDuracao(489.4)).toBe('8 min');
    expect(formatarDuracao(3547.3)).toBe('59 min');
    expect(formatarDuracao(3900)).toBe('1 h 05 min');
  });
  it('distância', () => {
    expect(formatarDistancia(848)).toBe('850 m');
    expect(formatarDistancia(5360.6)).toBe('5,4 km');
    expect(formatarDistancia(12400)).toBe('12 km');
  });
  it('link do Google Maps com modo e ponto de passagem', () => {
    const url = linkNavegacao(CRUZ, CRUZ, 'a_pe', CRUZ);
    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('travelmode=walking');
    expect(url).toContain('waypoints=-23.681407,-46.694591');
    expect(linkNavegacao(CRUZ, CRUZ, 'carro_onibus')).not.toContain('waypoints');
  });
});

describe('classificarRotas (replay)', () => {
  const principal = rota('principal', 40, 500);
  const desvio = rota('desvio', 400, 800);

  it('18:00: a que passa no cruzamento tem Aviso; a outra, Sem estimativa', () => {
    const r = classificarRotas([desvio, principal], cruzamento, MOCK_RISCO['18:00']['nu-jaime']);
    expect(r.map((x) => [x.id, x.situacao])).toEqual([
      ['principal', 'aviso'],
      ['desvio', 'sem_estimativa'],
    ]);
    expect(r[0].nome).toBe('Pela Av. das Nações Unidas');
    expect(r[1].nome).toBe('Rota alternativa');
  });
  it('18:48: a principal fica Bloqueada (vai para o fim) e a alternativa Recomendada', () => {
    const r = classificarRotas([principal, desvio], cruzamento, MOCK_RISCO['18:48']['nu-jaime']);
    expect(r.map((x) => [x.id, x.situacao])).toEqual([
      ['desvio', 'recomendada'],
      ['principal', 'bloqueada'],
    ]);
    expect(r[1].nota).toContain('18:48');
  });
  it('se nenhuma rota passa pelo cruzamento, todas ficam Sem estimativa', () => {
    const r = classificarRotas([desvio], cruzamento, MOCK_RISCO['18:48']['nu-jaime']);
    expect(r[0].situacao).toBe('sem_estimativa');
    expect(r[0].nota).toBe('Não passa por cruzamentos do estudo.');
  });
});

describe('origem do tempo', () => {
  it('sempre diz se o tempo tem ou não trânsito', () => {
    expect(rotuloTempo({ comTransito: true })).toBe('com trânsito agora');
    expect(rotuloTempo({ comTransito: false })).toBe('sem trânsito');
  });
  it('rodapé conforme o serviço usado', () => {
    expect(fonteDasRotas([{ fonte: 'mapbox', comTransito: true }], 'carro_onibus')).toContain('trânsito de agora');
    expect(fonteDasRotas([{ fonte: 'osrm', comTransito: false }], 'carro_onibus')).toContain('sem trânsito');
    // se alguma rota veio do OSRM (reserva), o aviso de "sem trânsito" aparece
    expect(fonteDasRotas([{ fonte: 'mapbox', comTransito: true }, { fonte: 'osrm', comTransito: false }], 'a_pe')).toContain('sem trânsito');
    expect(fonteDasRotas([{ fonte: 'mapbox', comTransito: false }], 'moto_bike')).toContain('bicicleta');
  });
});
