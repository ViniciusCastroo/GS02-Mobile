/**
 * Cliente com USE_MOCK = false: confere URLs, validação e tratamento de erros
 * da API real, com fetch simulado.
 */
jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  API_URL: 'https://api.teste',
  USE_MOCK: false,
  USAR_LOTE: true,
}));

import { ErroApiResposta, ErroConexao, buscarCruzamentos, buscarRisco } from '../../api/client';
import { mockCruzamentos, mockRisco, mockRiscos } from '../../api/mock';

const EM = '2025-01-16T18:48:00-03:00';
const resposta = (status: number, corpo: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(corpo) } as Response);

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

it('um cruzamento: GET /risco?local=…&em=…', async () => {
  fetchMock.mockReturnValueOnce(resposta(200, mockRisco('nu-jaime', EM)));
  const r = await buscarRisco('nu-jaime', EM);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.teste/risco?local=nu-jaime&em=2025-01-16T18%3A48%3A00-03%3A00');
  expect(r.confirmado_cge).toBe(true);
});

it('vários ao mesmo tempo: uma chamada GET /risco?locais=', async () => {
  fetchMock.mockReturnValueOnce(resposta(200, mockRiscos(['nu-jaime', 'cruzamento-2'], EM)));
  const [a, b] = await Promise.all([buscarRisco('nu-jaime', EM), buscarRisco('cruzamento-2', EM)]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://api.teste/risco?locais=nu-jaime,cruzamento-2&em=2025-01-16T18%3A48%3A00-03%3A00',
  );
  expect([a.local_id, b.local_id]).toEqual(['nu-jaime', 'cruzamento-2']);
});

it('404 vira ErroApiResposta com o código da API', async () => {
  fetchMock.mockReturnValueOnce(resposta(404, { erro: { codigo: 'local_nao_encontrado', mensagem: 'não existe' } }));
  await expect(buscarRisco('xyz')).rejects.toMatchObject({ status: 404, codigo: 'local_nao_encontrado' });
  expect(ErroApiResposta).toBeDefined();
});

it('5xx e falha de rede viram ErroConexao (o app mostra o cache)', async () => {
  fetchMock.mockReturnValueOnce(resposta(503, { erro: { codigo: 'modelo_indisponivel', mensagem: 'x' } }));
  await expect(buscarRisco('nu-jaime')).rejects.toBeInstanceOf(ErroConexao);
  fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Network request failed')));
  await expect(buscarRisco('nu-jaime')).rejects.toBeInstanceOf(ErroConexao);
});

it('resposta fora do contrato é recusada', async () => {
  fetchMock.mockReturnValueOnce(resposta(200, { ...mockRisco('nu-jaime'), estimativa: '1,2%' }));
  await expect(buscarRisco('nu-jaime')).rejects.toThrow('fora do formato');
});

it('GET /cruzamentos', async () => {
  fetchMock.mockReturnValueOnce(resposta(200, mockCruzamentos()));
  expect(await buscarCruzamentos()).toHaveLength(4);
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.teste/cruzamentos');
});
