import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { cores, espacos, fontes, raio, tipografia } from '../theme';
import type { SituacaoRota, StatusRisco } from '../types';
import { Texto } from './Texto';

/** Status de um lugar (risco) ou situação de uma rota. */
export type TipoSelo = StatusRisco | SituacaoRota | 'confirmado';

type NomeIcone = keyof typeof Ionicons.glyphMap;

export interface EstiloSelo {
  rotulo: string;
  icone: NomeIcone;
  cor: string;
  fundo: string;
  ponto: string;
}

export const SELOS: Record<TipoSelo, EstiloSelo> = {
  elevado: { rotulo: 'Risco elevado', icone: 'warning', cor: cores.aviso, fundo: cores.avisoFundo, ponto: cores.avisoPonto },
  aviso: { rotulo: 'Aviso', icone: 'warning', cor: cores.aviso, fundo: cores.avisoFundo, ponto: cores.avisoPonto },
  confirmado: {
    rotulo: 'Alagamento confirmado',
    icone: 'close-circle',
    cor: cores.bloqueado,
    fundo: cores.bloqueadoFundo,
    ponto: cores.bloqueadoForte,
  },
  bloqueada: {
    rotulo: 'Bloqueada',
    icone: 'close-circle',
    cor: cores.bloqueado,
    fundo: cores.bloqueadoFundo,
    ponto: cores.bloqueadoForte,
  },
  normal: { rotulo: 'Normal', icone: 'checkmark-circle', cor: cores.normal, fundo: cores.normalFundo, ponto: cores.normalPonto },
  recomendada: {
    rotulo: 'Recomendada',
    icone: 'checkmark-circle',
    cor: cores.recomendada,
    fundo: cores.recomendadaFundo,
    ponto: cores.recomendada,
  },
  sem_estimativa: {
    rotulo: 'Sem estimativa',
    icone: 'help-circle',
    cor: cores.semEstimativa,
    fundo: cores.semEstimativaFundo,
    ponto: cores.semEstimativaPonto,
  },
};

export function rotuloSelo(tipo: TipoSelo): string {
  return SELOS[tipo].rotulo;
}

interface Props {
  tipo: TipoSelo;
  /** Troca o texto padrão, se preciso. */
  rotulo?: string;
  compacto?: boolean;
}

/** Selo de status: sempre texto + ícone + cor (nunca só cor). */
export function StatusBadge({ tipo, rotulo, compacto }: Props) {
  const s = SELOS[tipo];
  const texto = rotulo ?? s.rotulo;
  return (
    <View
      style={[styles.selo, compacto && styles.compacto, { backgroundColor: s.fundo }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Situação: ${texto}`}
    >
      <Ionicons
        name={s.icone}
        size={compacto ? 14 : 16}
        color={s.cor}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Texto style={[styles.texto, { color: s.cor }]}>{texto}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: raio.pilula,
  },
  compacto: { paddingHorizontal: 9, paddingVertical: 3, gap: espacos.xs },
  texto: { fontFamily: fontes.negrito, fontSize: tipografia.legenda },
});
