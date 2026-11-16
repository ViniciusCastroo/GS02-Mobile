import { Pressable, StyleSheet, View } from 'react-native';
import { cores, espacos, fontes, raio, tipografia, TOQUE_MINIMO } from '../theme';
import { Texto } from './Texto';

export interface Opcao<T extends string | number> {
  valor: T;
  rotulo: string;
  /** Nome lido pelo leitor de tela, se diferente do rótulo (ex.: "Segunda" para "Seg"). */
  rotuloAcessivel?: string;
}

interface Props<T extends string | number> {
  /** Nome do grupo, lido pelo leitor de tela. */
  titulo: string;
  opcoes: Opcao<T>[];
  /** Valores marcados (um só quando `multiplo` é falso). */
  selecionados: T[];
  onAlternar: (valor: T) => void;
  multiplo?: boolean;
  /** Divide a linha em partes iguais (ex.: dias da semana). */
  igual?: boolean;
  dica?: (opcao: Opcao<T>, selecionado: boolean) => string;
}

/** Fichas de escolha (etiquetas, dias, cruzamento) com accessibilityState marcado. */
export function Chips<T extends string | number>({
  titulo,
  opcoes,
  selecionados,
  onAlternar,
  multiplo = false,
  igual = false,
  dica,
}: Props<T>) {
  return (
    <View
      style={[styles.linha, igual && styles.linhaIgual]}
      accessibilityRole={multiplo ? undefined : 'radiogroup'}
      accessibilityLabel={titulo}
    >
      {opcoes.map((o) => {
        const ativo = selecionados.includes(o.valor);
        const nome = o.rotuloAcessivel ?? o.rotulo;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onAlternar(o.valor)}
            accessibilityRole={multiplo ? 'checkbox' : 'radio'}
            accessibilityLabel={nome}
            accessibilityHint={
              dica ? dica(o, ativo) : multiplo ? `${ativo ? 'Desmarca' : 'Marca'} ${nome}` : `Escolhe ${nome}`
            }
            accessibilityState={{ selected: ativo, checked: ativo }}
            style={({ pressed }) => [
              styles.chip,
              igual && styles.chipIgual,
              ativo ? styles.ativo : styles.inativo,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Texto style={[styles.texto, igual && styles.textoIgual, { color: ativo ? cores.textoSobreDestaque : cores.texto }]}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: espacos.sm },
  linhaIgual: { flexWrap: 'nowrap', gap: 6 },
  chip: {
    minHeight: TOQUE_MINIMO,
    minWidth: TOQUE_MINIMO,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
  },
  chipIgual: { flex: 1, minWidth: 0, paddingHorizontal: 0, borderRadius: raio.md },
  ativo: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  inativo: { backgroundColor: cores.superficie, borderColor: cores.borda },
  texto: { fontFamily: fontes.medio, fontSize: tipografia.base },
  textoIgual: { fontFamily: fontes.semi, fontSize: tipografia.pequeno },
});
