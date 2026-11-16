import { StyleSheet, View } from 'react-native';
import { cores, espacos, raio } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { Texto } from './Texto';

interface Props {
  titulo?: string;
  /** Ex.: "Você está vendo o último dado salvo, das 17:45." */
  mensagem: string;
  onTentarNovamente?: () => void;
}

/** Aviso escuro de falta de conexão, em linguagem simples. */
export function ErrorState({ titulo = 'Opa, ficamos sem conexão', mensagem, onTentarNovamente }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.textos}>
        <Texto variante="subtitulo" cor={cores.textoSobreEscuro} style={{ fontSize: 17 }}>
          {titulo}
        </Texto>
        <Texto variante="pequeno" cor={cores.textoSobreEscuroSuave}>
          {mensagem}
        </Texto>
      </View>
      {onTentarNovamente ? (
        <PrimaryButton
          titulo="Tentar agora"
          variante="claro"
          compacto
          onPress={onTentarNovamente}
          accessibilityHint="Tenta buscar a previsão mais recente outra vez"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: cores.escuro,
    borderRadius: raio.xl,
    paddingHorizontal: espacos.md,
    paddingVertical: 14,
    gap: 10,
  },
  textos: { gap: 3 },
});
