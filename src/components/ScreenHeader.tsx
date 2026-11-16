import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { cores, espacos } from '../theme';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Ação à direita do título (ex.: botão "Ajuda"). */
  acao?: ReactNode;
}

/** Título grande da tela, anunciado como cabeçalho pelo leitor de tela. */
export function ScreenHeader({ titulo, subtitulo, acao }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.linha}>
        <Texto variante="tituloTela" accessibilityRole="header" style={styles.titulo}>
          {titulo}
        </Texto>
        {acao}
      </View>
      {subtitulo ? <Texto cor={cores.textoSecundario}>{subtitulo}</Texto> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: espacos.sm },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacos.sm },
  titulo: { flexShrink: 1 },
});
