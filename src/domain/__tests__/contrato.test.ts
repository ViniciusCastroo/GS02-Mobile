// Os testes do cliente usam o mock, qualquer que seja o USE_MOCK do config.ts.
jest.mock('../../config', () => ({ ...jest.requireActual('../../config'), USE_MOCK: true }));

import { ErroApiResposta, buscarCruzamentos, buscarRisco } from '../../api/client';
import { ErroMock, mockCruzamentos, mockRisco, mockRiscos } from '../../api/mock';
import { CRUZAMENTOS_PADRAO, definirCruzamentos, idsCruzamentos } from '../../data/cruzamentos';
import { INSTANTES_REPLAY } from '../../state/replay';
import {
  lerErroApi,
  montarUrlCruzamentos,
  montarUrlRisco,
  paraCruzamento,
  paraCruzamentoApi,
  validarCruzamentos,
  validarLoteRisco,
} from '../contrato';
import { ehCruzamentoCoberto, validarRespostaRisco } from '../risco';

describe('URLs do contrato', () => {
  it('/risco?local= com em codificado', () => {
    expect(montarUrlRisco('https://api.x/', { local: 'nu-jaime', em: '2025-01-16T18:48:00-03:00' })).toBe(
      'https://api.x/risco?local=nu-jaime&em=2025-01-16T18%3A48%3A00-03%3A00',
    );
  });
  it('fuso positivo: o "+" vira %2B', () => {
    expect(montarUrlRisco('https://api.x', { local: 'a', em: '2025-01-16T18:00:00+01:00' })).toContain('%2B01%3A00');
  });
  it('/risco?locais= separado por vírgula e sem em', () => {
    expect(montarUrlRisco('https://api.x', { locais: ['nu-jaime', 'cruzamento-2'] })).toBe(
      'https://api.x/risco?locais=nu-jaime,cruzamento-2',
    );
  });
  it('/cruzamentos', () => {
    expect(montarUrlCruzamentos('https://api.x/')).toBe('https://api.x/cruzamentos');
  });
});

describe('GET /cruzamentos', () => {
  it('o mock segue o contrato e volta igual ao formato das telas', () => {
    const lista = validarCruzamentos(mockCruzamentos());
    expect(lista).toHaveLength(4);
    expect(lista[0]).toEqual({
      id: 'nu-jaime',
      nome: 'Av. das Nações Unidas × R. Jaime de Oliveira Souza',
      nome_curto: 'Nações Unidas × Jaime de Oliveira Souza',
      via: 'Av. das Nações Unidas',
      bairro: 'Vila Géa',
      latitude: -23.6814075,
      longitude: -46.694591,
      placeholder: false,
    });
    expect(lista[1]).toMatchObject({ id: 'cruzamento-2', via: null, latitude: null, placeholder: true });
    expect(lista.map(paraCruzamento)[0]).toEqual(CRUZAMENTOS_PADRAO[0]);
  });
  it('sem via usa o nome curto; sem posição, coordenada null', () => {
    const c = paraCruzamento({ ...paraCruzamentoApi(CRUZAMENTOS_PADRAO[0]), via: null, longitude: null });
    expect(c.via).toBe('Nações Unidas × Jaime de Oliveira Souza');
    expect(c.coordenada).toBeNull();
  });
  it('rejeita lista vazia ou item com tipo errado', () => {
    expect(() => validarCruzamentos([])).toThrow();
    expect(() => validarCruzamentos([{ ...mockCruzamentos()[0], latitude: '-23.6' }])).toThrow();
    expect(() => validarCruzamentos({})).toThrow();
  });
  it('a lista da API passa a valer no app (ids cobertos)', () => {
    definirCruzamentos([...CRUZAMENTOS_PADRAO, { ...CRUZAMENTOS_PADRAO[1], id: 'novo-5' }]);
    expect(ehCruzamentoCoberto('novo-5')).toBe(true);
    definirCruzamentos(CRUZAMENTOS_PADRAO);
    expect(idsCruzamentos()).not.toContain('novo-5');
  });
});

describe('GET /risco com em= (mock como servidor)', () => {
  const nu = (em?: string) => mockRisco('nu-jaime', em);
  it('18:00 = aviso; 18:30 = ainda aviso; 18:48 = confirmado pelo CGE', () => {
    expect(nu(INSTANTES_REPLAY['18:00'])).toMatchObject({ status: 'elevado', confirmado_cge: false, confirmado_em: null });
    expect(nu('2025-01-16T18:30:00-03:00')).toMatchObject({ status: 'elevado', confirmado_cge: false });
    expect(nu(INSTANTES_REPLAY['18:48'])).toMatchObject({
      status: 'elevado',
      confirmado_cge: true,
      confirmado_em: '2025-01-16T18:48:00-03:00',
      previsao_hora: '2025-01-16T18:00:00-03:00',
      valida_ate: '2025-01-16T19:00:00-03:00',
    });
  });
  it('fora da hora do replay não há dado: sem_estimativa, na hora certa', () => {
    expect(nu('2025-01-16T19:10:00-03:00')).toMatchObject({
      status: 'sem_estimativa',
      previsao_hora: '2025-01-16T19:00:00-03:00',
      valida_ate: '2025-01-16T20:00:00-03:00',
    });
  });
  it('todas as respostas passam na validação do app', () => {
    for (const id of ['nu-jaime', 'cruzamento-2', 'cruzamento-3', 'cruzamento-4']) {
      expect(() => validarRespostaRisco(mockRisco(id, INSTANTES_REPLAY['18:48']))).not.toThrow();
    }
  });
  it('local desconhecido = 404 local_nao_encontrado; em inválido = 400', () => {
    expect(() => mockRisco('xyz')).toThrow(expect.objectContaining({ status: 404, codigo: 'local_nao_encontrado' }));
    expect(() => mockRisco('nu-jaime', 'ontem')).toThrow(ErroMock);
  });
  it('/risco?locais= separa os não encontrados', () => {
    const lote = validarLoteRisco(mockRiscos(['nu-jaime', 'xyz', 'cruzamento-2'], INSTANTES_REPLAY['18:00']));
    expect(lote.riscos.map((r) => r.local_id)).toEqual(['nu-jaime', 'cruzamento-2']);
    expect(lote.nao_encontrados).toEqual(['xyz']);
    expect(() => mockRiscos([])).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('corpo de erro da API', () => {
    expect(lerErroApi({ erro: { codigo: 'parametro_invalido', mensagem: 'x' } })).toEqual({
      codigo: 'parametro_invalido',
      mensagem: 'x',
    });
    expect(lerErroApi({ message: 'x' })).toBeNull();
  });
});

describe('cliente (USE_MOCK = true)', () => {
  it('pedidos ao mesmo tempo saem juntos e cada um recebe o seu', async () => {
    const [a, b] = await Promise.all([
      buscarRisco('nu-jaime', INSTANTES_REPLAY['18:48']),
      buscarRisco('cruzamento-2', INSTANTES_REPLAY['18:48']),
    ]);
    expect(a).toMatchObject({ local_id: 'nu-jaime', confirmado_cge: true });
    expect(b).toMatchObject({ local_id: 'cruzamento-2', status: 'sem_estimativa' });
  });
  it('id desconhecido no lote vira erro só para ele', async () => {
    const [ok, ruim] = await Promise.allSettled([buscarRisco('nu-jaime'), buscarRisco('xyz')]);
    expect(ok.status).toBe('fulfilled');
    expect(ruim).toMatchObject({ status: 'rejected', reason: expect.any(ErroApiResposta) });
  });
  it('GET /cruzamentos', async () => {
    expect((await buscarCruzamentos()).map((c) => c.id)).toEqual(['nu-jaime', 'cruzamento-2', 'cruzamento-3', 'cruzamento-4']);
  });
});
