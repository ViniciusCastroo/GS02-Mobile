import { StyleSheet, View } from 'react-native';
import { cores, fontes } from '../theme';
import type { PropsMapa } from './Mapa.tipos';
import { Texto } from './Texto';

/**
 * Ilustração de ruas. Usada na web (react-native-maps não roda no navegador)
 * e, no celular, quando o lugar não tem cruzamento com posição conhecida.
 */
export function MapaIlustrado({ altura, children, descricao, legenda }: PropsMapa) {
  return (
    <View style={[styles.mapa, { height: altura }]}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="image"
        accessibilityLabel={descricao}
      >
        <View style={[styles.rua, { top: '58%', left: -20, right: -20, height: 14, transform: [{ rotate: '-8deg' }] }]} />
        <View style={[styles.rua, { top: -20, bottom: -20, left: '62%', width: 12, transform: [{ rotate: '12deg' }] }]} />
        <View style={[styles.rua, { top: '30%', left: -20, right: '30%', height: 8, transform: [{ rotate: '4deg' }] }]} />
        <View style={[styles.rua, { top: -20, bottom: -20, left: '22%', width: 8, transform: [{ rotate: '-6deg' }] }]} />
        {legenda ? (
          <Texto variante="legenda" style={styles.legenda}>
            {legenda}
          </Texto>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mapa: { backgroundColor: cores.mapa, overflow: 'hidden', position: 'relative' },
  rua: { position: 'absolute', backgroundColor: cores.mapaRua, borderRadius: 4 },
  legenda: { position: 'absolute', left: 16, bottom: 40, fontFamily: fontes.regular },
});
