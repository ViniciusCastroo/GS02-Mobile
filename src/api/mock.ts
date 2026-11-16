/**
 * Mock local da API: responde como o backend responderia, seguindo o mesmo
 * contrato (GET /cruzamentos, /risco?local=, /risco?locais= e o parâmetro em=).
 *
 * Dados do replay do caso real de 16/01/2025:
 * - previsão das 18:00 (válida até 19:00): aviso no cruzamento
 *   Av. das Nações Unidas × R. Jaime de Oliveira Souza
 * - 18:48: o CGE registra o alagamento (confirmado_cge = true)
 *
 * Nenhum número foi inventado: o valor exato da estimativa não foi informado,
 * por isso "estimativa" é null (o app mostra "[x,xx]%"). Os outros 3
 * cruzamentos do estudo ainda são placeholders, sem estimativa.
 */
import { CRUZAMENTOS_PADRAO } from '../data/cruzamentos';
import { paraCruzamentoApi, type CruzamentoApi, type LoteRisco } from '../domain/contrato';
import { LIMIAR_PADRAO, validadeDaPrevisao } from '../domain/risco';
import { INSTANTES_REPLAY } from '../state/replay';
import type { MomentoReplay, RiscoResposta } from '../types';

const PREVISAO_DEMO = '2025-01-16T18:00:00-03:00';
const FIM_DEMO = '2025-01-16T19:00:00-03:00';
const CONFIRMACAO_CGE = '2025-01-16T18:48:00-03:00';
const ms = (iso: string) => new Date(iso).getTime();

/** Erro com o mesmo código que a API devolveria. */
export class ErroMock extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroMock';
  }
}

export function mockCruzamentos(): CruzamentoApi[] {
  return CRUZAMENTOS_PADRAO.map(paraCruzamentoApi);
}

/** Início da hora (em -03:00) que contém o instante. */
function inicioDaHora(em: string): string {
  const d = new Date(ms(em) - 3 * 3600 * 1000); // relógio de São Paulo em UTC
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:00:00-03:00`;
}

/**
 * GET /risco?local={id}&em={datetime}. Sem em, usa o início do replay (18:00).
 * Dentro da hora das 18:00 de 16/01/2025, nu-jaime está elevado e fica
 * confirmado a partir das 18:48. Fora dessa hora, e nos outros cruzamentos,
 * não há dado: sem_estimativa.
 */
export function mockRisco(localId: string, em: string = PREVISAO_DEMO): RiscoResposta {
  const cruzamento = CRUZAMENTOS_PADRAO.find((c) => c.id === localId);
  if (!cruzamento) throw new ErroMock(404, 'local_nao_encontrado', `Cruzamento '${localId}' não existe.`);
  if (Number.isNaN(ms(em))) throw new ErroMock(400, 'parametro_invalido', 'em fora do formato ISO 8601.');

  const dentroDaDemo = ms(em) >= ms(PREVISAO_DEMO) && ms(em) < ms(FIM_DEMO);
  const previsao_hora = dentroDaDemo ? PREVISAO_DEMO : inicioDaHora(em);
  const base: RiscoResposta = {
    local_id: localId,
    cruzamento: cruzamento.nome,
    previsao_hora,
    valida_ate: validadeDaPrevisao(previsao_hora),
    estimativa: null,
    limiar: LIMIAR_PADRAO,
    status: 'sem_estimativa',
    confirmado_cge: false,
    confirmado_em: null,
  };
  if (localId !== 'nu-jaime' || !dentroDaDemo) return base;
  const confirmado = ms(em) >= ms(CONFIRMACAO_CGE);
  return {
    ...base,
    status: 'elevado',
    confirmado_cge: confirmado,
    confirmado_em: confirmado ? CONFIRMACAO_CGE : null,
  };
}

/** GET /risco?locais=a,b&em=… */
export function mockRiscos(locais: string[], em?: string): LoteRisco {
  if (locais.length === 0) throw new ErroMock(400, 'parametro_invalido', 'Informe ao menos um local.');
  const lote: LoteRisco = { riscos: [], nao_encontrados: [] };
  for (const id of locais) {
    try {
      lote.riscos.push(mockRisco(id, em));
    } catch (e) {
      if (e instanceof ErroMock && e.status === 404) lote.nao_encontrados.push(id);
      else throw e;
    }
  }
  return lote;
}

/** Atalho para os testes: as respostas de cada momento do replay. */
export const MOCK_RISCO: Record<MomentoReplay, Record<string, RiscoResposta>> = Object.fromEntries(
  (Object.keys(INSTANTES_REPLAY) as MomentoReplay[]).map((m) => [
    m,
    Object.fromEntries(CRUZAMENTOS_PADRAO.map((c) => [c.id, mockRisco(c.id, INSTANTES_REPLAY[m])])),
  ]),
) as Record<MomentoReplay, Record<string, RiscoResposta>>;
