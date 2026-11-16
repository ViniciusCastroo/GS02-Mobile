import { MOCK_RISCO } from '../../api/mock';
import type { RiscoResposta } from '../../types';
import {
  calcularStatus,
  deveAvisar,
  deveBloquear,
  deveRegistrarAlerta,
  formatarData,
  formatarDataExtenso,
  resumoDoLugar,
  formatarEstimativa,
  formatarHora,
  formatarPercentual,
  LIMIAR_PADRAO,
  resolverStatus,
  seloDoLugar,
  situacaoRotaAlternativa,
  situacaoRotaPrincipal,
  textoAtualizado,
  textoPrevisao,
  validadeDaPrevisao,
  validarRespostaRisco,
} from '../risco';

const base: RiscoResposta = MOCK_RISCO['18:00']['nu-jaime'];
const confirmado: RiscoResposta = MOCK_RISCO['18:48']['nu-jaime'];

describe('calcularStatus', () => {
  it('usa o limiar de 1,083%', () => {
    expect(LIMIAR_PADRAO).toBe(0.01083);
  });
  it('acima do limiar = elevado', () => {
    expect(calcularStatus({ estimativa: 0.0109 })).toBe('elevado');
  });
  it('abaixo ou igual ao limiar = normal', () => {
    expect(calcularStatus({ estimativa: 0.005 })).toBe('normal');
    expect(calcularStatus({ estimativa: 0.01083 })).toBe('normal');
  });
  it('sem estimativa ou sem chuva medida = sem_estimativa', () => {
    expect(calcularStatus({ estimativa: null })).toBe('sem_estimativa');
    expect(calcularStatus({ estimativa: 0.5, chuvaMedida: false })).toBe('sem_estimativa');
  });
});

describe('resolverStatus', () => {
  it('fora dos 4 cruzamentos = sem_estimativa', () => {
    expect(resolverStatus({ ...base, local_id: 'outro-lugar' })).toBe('sem_estimativa');
    expect(resolverStatus(null)).toBe('sem_estimativa');
  });
  it('sem número usa o status enviado pela API', () => {
    expect(resolverStatus(base)).toBe('elevado');
  });
  it('com número recalcula pelo limiar', () => {
    expect(resolverStatus({ ...base, estimativa: 0.001, status: 'elevado' })).toBe('normal');
  });
  it('placeholders dos outros cruzamentos ficam sem estimativa', () => {
    expect(resolverStatus(MOCK_RISCO['18:00']['cruzamento-2'])).toBe('sem_estimativa');
  });
});

describe('aviso x bloqueio', () => {
  it('18:00: só previsão -> aviso, sem bloqueio', () => {
    expect(deveAvisar(base)).toBe(true);
    expect(deveBloquear(base)).toBe(false);
    expect(situacaoRotaPrincipal(base)).toBe('aviso');
    expect(situacaoRotaAlternativa('aviso')).toBe('sem_estimativa');
    expect(seloDoLugar(base)).toBe('elevado');
  });
  it('18:48: CGE confirmou -> bloqueada e alternativa recomendada', () => {
    expect(deveBloquear(confirmado)).toBe(true);
    expect(deveAvisar(confirmado)).toBe(false);
    expect(situacaoRotaPrincipal(confirmado)).toBe('bloqueada');
    expect(situacaoRotaAlternativa('bloqueada')).toBe('recomendada');
    expect(seloDoLugar(confirmado)).toBe('confirmado');
  });
  it('status normal sem confirmação não bloqueia nem avisa', () => {
    const normal = { ...base, estimativa: 0.002 };
    expect(situacaoRotaPrincipal(normal)).toBe('normal');
    expect(deveRegistrarAlerta(normal)).toBe(false);
  });
  it('registra alerta quando elevado ou confirmado', () => {
    expect(deveRegistrarAlerta(base)).toBe(true);
    expect(deveRegistrarAlerta(confirmado)).toBe(true);
    expect(deveRegistrarAlerta(MOCK_RISCO['18:00']['cruzamento-3'])).toBe(false);
  });
});

describe('formatação', () => {
  it('formata horas respeitando o fuso do texto', () => {
    expect(formatarHora('2025-01-16T18:48:00-03:00')).toBe('18:48');
    expect(formatarHora(null)).toBe('--:--');
    expect(formatarData('2025-01-16T18:00:00-03:00')).toBe('16/01/2025');
  });
  it('monta os textos de previsão e atualização', () => {
    expect(textoPrevisao(base)).toBe('Previsão das 18:00, válida até 19:00');
    expect(textoAtualizado('2026-11-15T14:05:00-03:00')).toBe('Atualizado às 14:05');
  });
  it('formata percentuais e o placeholder da estimativa', () => {
    expect(formatarPercentual(0.01083, 3)).toBe('1,083%');
    expect(formatarEstimativa(null)).toBe('[x,xx]%');
    expect(formatarEstimativa(0.0123)).toBe('1,23%');
  });
  it('a previsão vale por 1 hora', () => {
    expect(validadeDaPrevisao('2025-01-16T18:00:00-03:00')).toBe('2025-01-16T19:00:00-03:00');
    expect(validadeDaPrevisao('2025-01-16T23:00:00-03:00')).toBe('2025-01-17T00:00:00-03:00');
  });
});

describe('validarRespostaRisco', () => {
  it('aceita o contrato da API', () => {
    expect(validarRespostaRisco(JSON.parse(JSON.stringify(confirmado)))).toEqual(confirmado);
  });
  it('rejeita respostas fora do formato', () => {
    expect(() => validarRespostaRisco({ ...base, status: 'alto' })).toThrow();
    expect(() => validarRespostaRisco(null)).toThrow();
  });
});

describe('textos do design', () => {
  it('data por extenso com dia da semana', () => {
    expect(formatarDataExtenso('2025-01-16T18:48:00-03:00')).toBe('16 jan 2025 · quinta');
  });
  it('resumo do lugar às 18:00, às 18:48 e fora do estudo', () => {
    expect(resumoDoLugar(base, 'nu-jaime')).toMatchObject({
      status: 'elevado',
      confirmado: false,
      nota: 'Estimativa [x,xx]% · acima do limiar de 1,083%',
    });
    expect(resumoDoLugar(confirmado, 'nu-jaime')).toMatchObject({
      confirmado: true,
      nota: 'Alagamento confirmado pelo CGE às 18:48',
    });
    expect(resumoDoLugar(null, null)).toMatchObject({ status: 'sem_estimativa', nota: 'Fora dos 4 cruzamentos do estudo' });
  });
});
