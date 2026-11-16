import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { cores, espacos, raio } from '../theme';
import { Texto } from './Texto';

export function LoadingState({ mensagem = 'Olhando o céu… buscando a previsão' }: { mensagem?: string }) {
  return (
    <View
      style={styles.linha}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={mensagem}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size="small" color={cores.destaque} />
      <Texto variante="pequeno">{mensagem}</Texto>
    </View>
  );
}

/** Cartões "fantasma" enquanto os dados carregam (escondidos do leitor de tela). */
export function CartoesCarregando({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <View style={{ gap: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: quantidade }, (_, i) => (
        <View key={i} style={styles.cartao}>
          <View style={[styles.barra, { width: 64, height: 10 }]} />
          <View style={[styles.barra, { width: 150, height: 16 }]} />
          <View style={[styles.barra, { width: 220, height: 12, backgroundColor: cores.esqueletoClaro }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espacos.sm, minHeight: 24 },
  cartao: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.bordaSuave,
    borderRadius: raio.xl,
    padding: espacos.md,
    gap: 10,
  },
  barra: { borderRadius: 4, backgroundColor: cores.esqueleto },
});
