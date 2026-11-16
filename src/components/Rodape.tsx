import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores } from '../theme';

/** Barra fixa no pé da tela para a ação principal (ex.: "Salvar", "Ver rotas"). */
export function Rodape({ children, fundo = cores.fundo, respeitarBorda = true }: { children: ReactNode; fundo?: string; respeitarBorda?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.rodape, { backgroundColor: fundo, paddingBottom: respeitarBorda ? Math.max(insets.bottom, 12) + 8 : 12 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rodape: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.bordaSuave, gap: 6 },
});
