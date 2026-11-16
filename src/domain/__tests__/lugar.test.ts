import { lugarValido, validarLugar } from '../lugar';

describe('validarLugar', () => {
  it('exige nome, etiqueta e endereço', () => {
    const erros = validarLugar({ nome: ' ', endereco: '' });
    expect(Object.keys(erros).sort()).toEqual(['endereco', 'etiqueta', 'nome']);
  });
  it('aceita lugar completo, com ou sem cruzamento', () => {
    const l = { nome: 'Trabalho', etiqueta: 'Trabalho' as const, endereco: 'Rua X', dias_horarios: '' };
    expect(lugarValido({ ...l, local_id: 'nu-jaime' })).toBe(true);
    expect(lugarValido({ ...l, local_id: null })).toBe(true);
  });
  it('rejeita cruzamento fora do estudo', () => {
    expect(validarLugar({ nome: 'A', etiqueta: 'Casa', endereco: 'B', local_id: 'xyz' }).local_id).toBeDefined();
  });
});

import { descreverRotina, lerRotina, rotuloEtiqueta, serializarRotina, sugerirCruzamento } from '../lugar';

describe('etiqueta personalizada', () => {
  it('exige o nome quando a etiqueta é Personalizada', () => {
    const base = { nome: 'A', endereco: 'B', etiqueta: 'Personalizada' as const };
    expect(validarLugar({ ...base, etiqueta_personalizada: ' ' }).etiqueta_personalizada).toBeDefined();
    expect(lugarValido({ ...base, etiqueta_personalizada: 'Academia' })).toBe(true);
  });
  it('mostra o nome personalizado no lugar da etiqueta', () => {
    expect(rotuloEtiqueta({ etiqueta: 'Personalizada', etiqueta_personalizada: 'Academia' })).toBe('Academia');
    expect(rotuloEtiqueta({ etiqueta: 'Casa', etiqueta_personalizada: 'x' })).toBe('Casa');
  });
});

describe('rotina (dias e horários)', () => {
  it('ida e volta pelo banco', () => {
    const r = { dias: [5, 1, 2, 3, 4, 1], chegada: '09:00', saida: '18:30' };
    expect(lerRotina(serializarRotina(r))).toEqual({ dias: [1, 2, 3, 4, 5], chegada: '09:00', saida: '18:30' });
  });
  it('texto antigo ou vazio vira rotina vazia', () => {
    expect(lerRotina('Seg a sex')).toEqual({ dias: [], chegada: '', saida: '' });
    expect(lerRotina(null).dias).toEqual([]);
  });
  it('descreve de forma simples', () => {
    expect(descreverRotina({ dias: [1, 2, 3, 4, 5], chegada: '09:00', saida: '18:30' })).toBe('Seg a Sex · 09:00–18:30');
    expect(descreverRotina({ dias: [0, 1, 2, 3, 4, 5, 6], chegada: '', saida: '' })).toBe('Todos os dias');
    expect(descreverRotina({ dias: [1, 3, 5], chegada: '', saida: '' })).toBe('Seg, Qua, Sex');
  });
  it('valida o formato dos horários', () => {
    const l = { nome: 'A', etiqueta: 'Casa' as const, endereco: 'B' };
    expect(validarLugar(l, { chegada: '25:00' }).chegada).toBeDefined();
    expect(validarLugar(l, { chegada: '07:30', saida: '' })).toEqual({});
  });
});

describe('sugerirCruzamento', () => {
  it('reconhece só o cruzamento real do estudo', () => {
    expect(sugerirCruzamento('Av. das Nações Unidas, 12901')).toBe('nu-jaime');
    expect(sugerirCruzamento('av nacoes unidas')).toBe('nu-jaime');
    expect(sugerirCruzamento('Av. Paulista, 1106')).toBeNull();
  });
});
