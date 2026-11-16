import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { cores, espacos } from '../theme';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  mensagem: string;
  icone?: keyof typeof Ionicons.glyphMap;
  /** Ações opcionais (ex.: botão "Adicionar lugar"). */
  acao?: ReactNode;
}

export function EmptyState({ titulo, mensagem, icone = 'location-outline', acao }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.circulo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name={icone} size={26} color={cores.destaque} />
      </View>
      <Texto variante="subtitulo" style={styles.titulo} accessibilityRole="header" centro>
        {titulo}
      </Texto>
      <Texto variante="corpo" cor={cores.textoSecundario} centro>
        {mensagem}
      </Texto>
      {acao}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 14, paddingHorizontal: espacos.md, paddingVertical: espacos.xl },
  circulo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: cores.tracejado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 20 },
});
