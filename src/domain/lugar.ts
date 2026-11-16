import { idsCruzamentos } from '../data/cruzamentos';
import { ETIQUETAS, type Lugar, type LugarEntrada } from '../types';

export type ErrosLugar = Partial<Record<keyof LugarEntrada | 'chegada' | 'saida', string>>;

/** Dias da semana, na ordem de Date.getDay() (0 = domingo). */
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const DIAS_SEMANA_EXTENSO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

export interface Rotina {
  dias: number[];
  chegada: string;
  saida: string;
}

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function horarioValido(texto: string): boolean {
  return HORA_VALIDA.test(texto.trim());
}

/** Guarda a rotina (dias + horários) na coluna dias_horarios. */
export function serializarRotina(r: Rotina): string {
  const dias = [...new Set(r.dias)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  return JSON.stringify({ dias, chegada: r.chegada.trim(), saida: r.saida.trim() });
}

/** Lê a coluna dias_horarios. Texto antigo (não-JSON) vira rotina vazia. */
export function lerRotina(texto: string | null | undefined): Rotina {
  const vazia: Rotina = { dias: [], chegada: '', saida: '' };
  if (!texto) return vazia;
  try {
    const j = JSON.parse(texto) as Partial<Rotina>;
    return {
      dias: Array.isArray(j.dias) ? j.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [],
      chegada: typeof j.chegada === 'string' ? j.chegada : '',
      saida: typeof j.saida === 'string' ? j.saida : '',
    };
  } catch {
    return vazia;
  }
}

/** "Seg a Sex · 09:00–18:30", "Todos os dias", "Dom". */
export function descreverRotina(r: Rotina): string {
  const dias = [...r.dias].sort((a, b) => a - b);
  let textoDias = '';
  if (dias.length === 7) textoDias = 'Todos os dias';
  else if (dias.length > 2 && dias.every((d, i) => i === 0 || d === dias[i - 1] + 1)) {
    textoDias = `${DIAS_SEMANA[dias[0]]} a ${DIAS_SEMANA[dias[dias.length - 1]]}`;
  } else textoDias = dias.map((d) => DIAS_SEMANA[d]).join(', ');
  const horas = r.chegada && r.saida ? `${r.chegada}–${r.saida}` : r.chegada || r.saida;
  return [textoDias, horas].filter(Boolean).join(' · ');
}

/** Etiqueta exibida: o nome personalizado, quando houver. */
export function rotuloEtiqueta(l: Pick<Lugar, 'etiqueta' | 'etiqueta_personalizada'>): string {
  return l.etiqueta === 'Personalizada' && l.etiqueta_personalizada?.trim()
    ? l.etiqueta_personalizada.trim()
    : l.etiqueta;
}

/**
 * Sugere o cruzamento do estudo a partir do endereço digitado.
 * Só o cruzamento real (Nações Unidas × Jaime de Oliveira Souza) é reconhecido;
 * os outros 3 ainda são placeholders e precisam ser escolhidos à mão.
 */
export function sugerirCruzamento(endereco: string): string | null {
  return /na[cç][oõ]es\s+unidas|jaime\s+de\s+oliveira/i.test(endereco) ? 'nu-jaime' : null;
}

/** Valida os campos obrigatórios do formulário de lugar. */
export function validarLugar(
  entrada: Partial<LugarEntrada>,
  rotina?: Partial<Rotina>,
): ErrosLugar {
  const erros: ErrosLugar = {};
  if (!entrada.nome?.trim()) erros.nome = 'Informe um nome para o lugar.';
  if (!entrada.etiqueta || !ETIQUETAS.includes(entrada.etiqueta)) {
    erros.etiqueta = 'Escolha uma etiqueta.';
  } else if (entrada.etiqueta === 'Personalizada' && !entrada.etiqueta_personalizada?.trim()) {
    erros.etiqueta_personalizada = 'Dê um nome para a etiqueta.';
  }
  if (!entrada.endereco?.trim()) erros.endereco = 'Informe o endereço.';
  if (entrada.local_id && !idsCruzamentos().includes(entrada.local_id)) {
    erros.local_id = 'Cruzamento inválido.';
  }
  if (rotina?.chegada && !horarioValido(rotina.chegada)) erros.chegada = 'Use o formato 09:00.';
  if (rotina?.saida && !horarioValido(rotina.saida)) erros.saida = 'Use o formato 18:30.';
  return erros;
}

export function lugarValido(entrada: Partial<LugarEntrada>, rotina?: Partial<Rotina>): boolean {
  return Object.keys(validarLugar(entrada, rotina)).length === 0;
}
