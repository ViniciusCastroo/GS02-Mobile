import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { cores, espacos, fontes, raio, tipografia, TOQUE_MINIMO } from '../theme';
import { Texto } from './Texto';

interface Props extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  dica: string;
  erro?: string;
  obrigatorio?: boolean;
  /** Texto de ajuda abaixo do campo. */
  ajuda?: string;
  /** Rótulo menor (ex.: "Chego às"). */
  rotuloPequeno?: boolean;
}

/** Campo de texto com rótulo visível, dica e mensagem de erro acessíveis. */
export function FormField({ rotulo, dica, erro, obrigatorio, ajuda, rotuloPequeno, ...props }: Props) {
  const visivel = obrigatorio ? `${rotulo} *` : rotulo;
  const lido = obrigatorio ? `${rotulo}, obrigatório` : rotulo;
  return (
    <View style={styles.campo}>
      <Texto variante={rotuloPequeno ? 'pequeno' : 'baseForte'}>{visivel}</Texto>
      <TextInput
        {...props}
        accessibilityLabel={lido}
        accessibilityHint={erro ? `${erro} ${dica}` : dica}
        placeholderTextColor={cores.textoTerciario}
        style={[styles.input, erro ? styles.inputErro : null]}
      />
      {erro ? (
        <Texto variante="pequeno" cor={cores.bloqueadoForte} accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : null}
      {ajuda ? <Texto variante="pequeno">{ajuda}</Texto> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6, flex: 1, minWidth: 0 },
  input: {
    minHeight: TOQUE_MINIMO,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: 14,
    paddingVertical: espacos.sm,
    fontFamily: fontes.regular,
    fontSize: tipografia.medio,
    color: cores.texto,
    backgroundColor: cores.superficie,
  },
  inputErro: { borderColor: cores.bloqueadoForte, borderWidth: 1.5 },
});
