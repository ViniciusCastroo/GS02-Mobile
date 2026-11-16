import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityState, type StyleProp, type ViewStyle } from 'react-native';
import { cores, espacos, raio, TOQUE_MINIMO } from '../theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Se informado, o cartão inteiro vira um botão. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'radio';
  accessibilityState?: AccessibilityState;
}

/** Cartão branco arredondado do design. */
export function Card({ children, style, onPress, accessibilityRole = 'button', ...a11y }: Props) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        {...a11y}
        style={({ pressed }) => [styles.card, styles.tocavel, pressed && styles.pressionado, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderRadius: raio.xl,
    borderWidth: 1,
    borderColor: cores.bordaSuave,
    paddingHorizontal: espacos.md,
    paddingVertical: 14,
    gap: 10,
  },
  tocavel: { minHeight: TOQUE_MINIMO },
  pressionado: { opacity: 0.85 },
});
