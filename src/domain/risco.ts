/**
 * Regras de negócio puras do Rota Seca (sem React, sem banco, sem rede).
 * Testadas em src/domain/__tests__/risco.test.ts.
 */
import { idsCruzamentos } from '../data/cruzamentos';
import type { RiscoResposta, SituacaoRota, StatusRisco } from '../types';

/** Limiar do modelo: estimativa acima de 1,083% = "Risco elevado". */
export const LIMIAR_PADRAO = 0.01083;

/** Texto usado quando o valor exato da estimativa ainda não foi informado. */
export const ESTIMATIVA_PLACEHOLDER = '—';

const STATUS_VALIDOS: StatusRisco[] = ['elevado', 'normal', 'sem_estimativa'];

export function ehCruzamentoCoberto(localId: string | null | undefined): boolean {
  return !!localId && idsCruzamentos().includes(localId);
}

/**
 * Calcula o status a partir da estimativa.
 * - sem chuva medida ou sem estimativa -> "sem_estimativa"
 * - acima do limiar -> "elevado"
 * - igual ou abaixo -> "normal"
 */
export function calcularStatus(params: {
  estimativa: number | null;
  limiar?: number;
  chuvaMedida?: boolean;
}): StatusRisco {
  const { estimativa, limiar = LIMIAR_PADRAO, chuvaMedida = true } = params;
  if (!chuvaMedida || estimativa === null || Number.isNaN(estimativa)) return 'sem_estimativa';
  return estimativa > limiar ? 'elevado' : 'normal';
}

/**
 * Status final de uma resposta da API.
 * Fora dos 4 cruzamentos do estudo é sempre "sem_estimativa".
 * Com estimativa numérica, o app recalcula pelo limiar.
 * Sem o número (ex.: valor ainda não divulgado), vale o status enviado pela API.
 */
export function resolverStatus(resposta: RiscoResposta | null | undefined): StatusRisco {
  if (!resposta || !ehCruzamentoCoberto(resposta.local_id)) return 'sem_estimativa';
  if (resposta.estimativa !== null) {
    return calcularStatus({ estimativa: resposta.estimativa, limiar: resposta.limiar });
  }
  return STATUS_VALIDOS.includes(resposta.status) ? resposta.status : 'sem_estimativa';
}

/** A rota só é bloqueada quando o CGE confirma a ocorrência. A previsão sozinha nunca bloqueia. */
export function deveBloquear(resposta: RiscoResposta | null | undefined): boolean {
  return !!resposta && ehCruzamentoCoberto(resposta.local_id) && resposta.confirmado_cge === true;
}

/** A previsão gera aviso (não bloqueio) quando o status é elevado e ainda não há confirmação. */
export function deveAvisar(resposta: RiscoResposta | null | undefined): boolean {
  return !deveBloquear(resposta) && resolverStatus(resposta) === 'elevado';
}

/** Grava alerta quando o lugar passa para "elevado" ou quando o CGE confirma. */
export function deveRegistrarAlerta(resposta: RiscoResposta | null | undefined): boolean {
  return deveBloquear(resposta) || resolverStatus(resposta) === 'elevado';
}

/** Situação da rota que passa pelo cruzamento consultado. */
export function situacaoRotaPrincipal(resposta: RiscoResposta | null | undefined): SituacaoRota {
  if (deveBloquear(resposta)) return 'bloqueada';
  const status = resolverStatus(resposta);
  if (status === 'elevado') return 'aviso';
  if (status === 'normal') return 'normal';
  return 'sem_estimativa';
}

/**
 * Situação da rota alternativa. Ela não passa por nenhum dos 4 cruzamentos do
 * estudo, então não tem estimativa própria. Só vira "recomendada" quando a
 * principal está bloqueada pelo CGE.
 */
export function situacaoRotaAlternativa(principal: SituacaoRota): SituacaoRota {
  return principal === 'bloqueada' ? 'recomendada' : 'sem_estimativa';
}

export function rotuloStatus(status: StatusRisco): string {
  switch (status) {
    case 'elevado':
      return 'Risco elevado';
    case 'normal':
      return 'Normal';
    default:
      return 'Sem estimativa';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "HH:MM" do horário escrito no próprio texto ISO (respeita o fuso informado,
 * ex.: -03:00). Assim o horário não muda com o fuso do celular.
 */
export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (m) return `${m[1]}:${m[2]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '--:--' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "DD/MM/AAAA" a partir do texto ISO. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '--/--/----';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '--/--/----';
}

export function textoPrevisao(resposta: Pick<RiscoResposta, 'previsao_hora' | 'valida_ate'>): string {
  return `Previsão das ${formatarHora(resposta.previsao_hora)}, válida até ${formatarHora(resposta.valida_ate)}`;
}

export function textoAtualizado(iso: string | null | undefined): string {
  return `Atualizado às ${formatarHora(iso)}`;
}

/** 0.01083 -> "1,083%" (casas = 3). */
export function formatarPercentual(valor: number, casas = 2): string {
  return `${(valor * 100).toFixed(casas).replace('.', ',')}%`;
}

/** Estimativa sem valor real vira "—". */
export function formatarEstimativa(estimativa: number | null | undefined): string {
  if (estimativa === null || estimativa === undefined || Number.isNaN(estimativa)) {
    return ESTIMATIVA_PLACEHOLDER;
  }
  return formatarPercentual(estimativa, 2);
}

/** Data/hora atual em ISO com o fuso do aparelho (ex.: 2026-11-15T14:30:00-03:00). */
export function agoraIsoLocal(data: Date = new Date()): string {
  const offsetMin = -data.getTimezoneOffset();
  const sinal = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}` +
    `${sinal}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Confere se o JSON recebido segue o contrato da API. Lança erro se não seguir. */
export function validarRespostaRisco(json: unknown): RiscoResposta {
  if (!json || typeof json !== 'object') throw new Error('Resposta inválida da API');
  const r = json as Record<string, unknown>;
  const ehTexto = (v: unknown) => typeof v === 'string';
  const ok =
    ehTexto(r.local_id) &&
    ehTexto(r.cruzamento) &&
    ehTexto(r.previsao_hora) &&
    ehTexto(r.valida_ate) &&
    (r.estimativa === null || typeof r.estimativa === 'number') &&
    typeof r.limiar === 'number' &&
    STATUS_VALIDOS.includes(r.status as StatusRisco) &&
    typeof r.confirmado_cge === 'boolean' &&
    (r.confirmado_em === null || ehTexto(r.confirmado_em));
  if (!ok) throw new Error('Resposta da API fora do formato esperado');
  return r as unknown as RiscoResposta;
}

/** Selo mostrado para um lugar: "confirmado" (CGE) tem prioridade sobre o status da previsão. */
export function seloDoLugar(resposta: RiscoResposta | null | undefined): StatusRisco | 'confirmado' {
  if (deveBloquear(resposta)) return 'confirmado';
  return resolverStatus(resposta);
}

/**
 * A previsão é horária: vale por 1 hora a partir de previsao_hora.
 * Mantém o fuso do texto original (ex.: 18:00-03:00 -> 19:00-03:00).
 */
export function validadeDaPrevisao(previsaoHora: string): string {
  const inicio = new Date(previsaoHora);
  if (Number.isNaN(inicio.getTime())) return previsaoHora;
  const m = /([+-])(\d{2}):(\d{2})$/.exec(previsaoHora);
  const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000 + offsetMin * 60 * 1000);
  const sufixo = m ? `${m[1]}${m[2]}:${m[3]}` : 'Z';
  return (
    `${fim.getUTCFullYear()}-${pad(fim.getUTCMonth() + 1)}-${pad(fim.getUTCDate())}` +
    `T${pad(fim.getUTCHours())}:${pad(fim.getUTCMinutes())}:${pad(fim.getUTCSeconds())}${sufixo}`
  );
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "16 jan 2025 · quinta" (usado nos grupos do histórico). */
export function formatarDataExtenso(iso: string | null | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return 'Data desconhecida';
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const semana = SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${m[3]} ${MESES[mes - 1]} ${ano} · ${semana}`;
}

export interface ResumoLugar {
  /** Status da previsão (selo do cartão). */
  status: StatusRisco;
  confirmado: boolean;
  /** Linha de baixo do cartão do lugar. */
  nota: string;
  /** Frase curta do detalhe. */
  frase: string;
}

/** Textos do cartão e do detalhe de um lugar, conforme o design v2. */
export function resumoDoLugar(resposta: RiscoResposta | null | undefined, localId: string | null): ResumoLugar {
  const limiar = formatarPercentual(resposta?.limiar ?? LIMIAR_PADRAO, 3);
  if (!ehCruzamentoCoberto(localId)) {
    return {
      status: 'sem_estimativa',
      confirmado: false,
      nota: 'Fora dos 4 cruzamentos do estudo',
      frase: 'Ainda não temos previsão pra este endereço: ele fica fora dos 4 cruzamentos do estudo.',
    };
  }
  const status = resolverStatus(resposta);
  if (resposta && deveBloquear(resposta)) {
    const hora = resposta.confirmado_em ? ` às ${formatarHora(resposta.confirmado_em)}` : '';
    return {
      status,
      confirmado: true,
      nota: `Alagamento confirmado pelo CGE${hora}`,
      frase: `O CGE confirmou alagamento neste cruzamento${hora}. Evite passar por aqui.`,
    };
  }
  if (status === 'elevado') {
    return {
      status,
      confirmado: false,
      nota:
        resposta?.estimativa != null
          ? `Estimativa ${formatarEstimativa(resposta.estimativa)} · acima do limiar de ${limiar}`
          : `Acima do limiar de ${limiar}`,
      frase: 'Pode alagar por aqui na próxima hora. Por enquanto é só um aviso: dá pra passar, mas fique de olho.',
    };
  }
  if (status === 'normal') {
    return {
      status,
      confirmado: false,
      nota: `Estimativa ${formatarEstimativa(resposta?.estimativa)}`,
      frase: 'Tudo tranquilo por aqui na próxima hora.',
    };
  }
  return {
    status,
    confirmado: false,
    nota: resposta ? 'Sem chuva medida ou sem dados agora' : 'Ainda sem previsão',
    frase: 'Ainda não há estimativa para este cruzamento agora (sem chuva medida ou sem dados).',
  };
}
