import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { cores, espacos, fontes, raio, sombra, tipografia, TOQUE_MINIMO } from '../theme';
import { Texto } from './Texto';

type Variante = 'primario' | 'secundario' | 'perigo' | 'texto' | 'tracejado' | 'claro' | 'flutuante';

interface Props {
  titulo: string;
  onPress: () => void;
  /** Descreve o que acontece ao tocar (leitor de tela). */
  accessibilityHint: string;
  accessibilityLabel?: string;
  variante?: Variante;
  icone?: keyof typeof Ionicons.glyphMap;
  desabilitado?: boolean;
  carregando?: boolean;
  /** Botão mais alto (56) para a ação principal da tela. */
  grande?: boolean;
  /** Não ocupa a largura toda. */
  compacto?: boolean;
  /** Cor do texto (só para as variantes "texto" e "flutuante"). */
  corTexto?: string;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  titulo,
  onPress,
  accessibilityHint,
  accessibilityLabel,
  variante = 'primario',
  icone,
  desabilitado = false,
  carregando = false,
  grande = false,
  compacto = false,
  corTexto,
  style,
}: Props) {
  const v = VARIANTES[variante];
  const corFinal = corTexto ?? v.texto;
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.botao,
        v.estilo,
        grande && styles.grande,
        compacto && styles.compacto,
        pressed && styles.pressionado,
        inativo && styles.inativo,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corFinal} />
      ) : icone ? (
        <Ionicons name={icone} size={20} color={corFinal} accessibilityElementsHidden importantForAccessibility="no" />
      ) : null}
      <Texto style={[styles.texto, { color: corFinal }, grande && styles.textoGrande]}>{titulo}</Texto>
    </Pressable>
  );
}

const VARIANTES: Record<Variante, { texto: string; estilo: ViewStyle }> = {
  primario: { texto: cores.textoSobreDestaque, estilo: { backgroundColor: cores.destaque } },
  secundario: {
    texto: cores.destaque,
    estilo: { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda },
  },
  perigo: { texto: cores.textoSobreDestaque, estilo: { backgroundColor: cores.bloqueadoForte } },
  texto: { texto: cores.destaque, estilo: { backgroundColor: 'transparent', paddingHorizontal: 0 } },
  tracejado: {
    texto: cores.destaque,
    estilo: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: cores.tracejado },
  },
  claro: { texto: cores.texto, estilo: { backgroundColor: cores.superficie, borderRadius: raio.sm } },
  flutuante: { texto: cores.texto, estilo: { backgroundColor: cores.superficie, ...sombra.leve } },
};

const styles = StyleSheet.create({
  botao: {
    minHeight: TOQUE_MINIMO,
    minWidth: TOQUE_MINIMO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacos.sm,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: raio.folha,
  },
  grande: { minHeight: 56 },
  compacto: { alignSelf: 'flex-start' },
  texto: { fontFamily: fontes.semi, fontSize: tipografia.medio, textAlign: 'center' },
  textoGrande: { fontFamily: fontes.extra },
  pressionado: { opacity: 0.85 },
  inativo: { opacity: 0.6 },
});
