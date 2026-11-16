import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { cores, raio, sombra } from '../theme';

/** "Folha" branca que sobe por cima do mapa (bottom sheet fixo do design). */
export function Folha({ children }: { children: ReactNode }) {
  return (
    <View style={styles.folha}>
      <View style={styles.pegador} accessibilityElementsHidden importantForAccessibility="no" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  folha: {
    flex: 1,
    minHeight: 0,
    marginTop: -28,
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.folha,
    borderTopRightRadius: raio.folha,
    ...sombra.folha,
  },
  pegador: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: cores.borda,
    marginTop: 10,
    marginBottom: 4,
  },
});
