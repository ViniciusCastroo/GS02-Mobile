import { StyleSheet, View } from 'react-native';
import { MODO_DEMO } from '../config';
import { cores, fontes, raio } from '../theme';
import { Texto } from './Texto';

/** Selo "Demonstração: replay de 16/01/2025" (aparece só com MODO_DEMO ligado). */
export function DemoBadge() {
  if (!MODO_DEMO) return null;
  return (
    <View style={styles.selo} accessible accessibilityRole="text">
      <Texto variante="legenda" style={styles.texto}>
        Demonstração: replay de 16/01/2025
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.pilula,
  },
  texto: { fontFamily: fontes.regular },
});
