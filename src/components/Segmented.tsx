import { Pressable, StyleSheet, View } from 'react-native';
import { cores, fontes, tipografia, TOQUE_MINIMO } from '../theme';
import type { Opcao } from './Chips';
import { Texto } from './Texto';

interface Props<T extends string> {
  titulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  onChange: (valor: T) => void;
  dica?: (opcao: Opcao<T>) => string;
  /** "claro": trilho bege, item ativo branco. "escuro": item ativo escuro (replay). */
  estilo?: 'claro' | 'escuro';
}

/** Controle segmentado (modo de deslocamento, horário do replay). */
export function Segmented<T extends string>({ titulo, opcoes, valor, onChange, dica, estilo = 'claro' }: Props<T>) {
  const escuro = estilo === 'escuro';
  return (
    <View style={[styles.trilho, escuro && styles.trilhoEscuro]} accessibilityRole="radiogroup" accessibilityLabel={titulo}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="radio"
            accessibilityLabel={o.rotuloAcessivel ?? o.rotulo}
            accessibilityHint={dica ? dica(o) : `Escolhe ${o.rotulo} em ${titulo}`}
            accessibilityState={{ selected: ativo, checked: ativo }}
            style={[
              styles.item,
              escuro && styles.itemEscuro,
              ativo && (escuro ? styles.ativoEscuro : styles.ativoClaro),
            ]}
          >
            <Texto
              style={[
                styles.texto,
                escuro && styles.textoEscuro,
                { color: ativo ? (escuro ? cores.textoSobreEscuro : cores.texto) : cores.textoSecundario },
              ]}
            >
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { flexDirection: 'row', backgroundColor: cores.trilho, borderRadius: 16, padding: 3 },
  trilhoEscuro: { backgroundColor: cores.superficie, borderRadius: 14 },
  item: {
    flex: 1,
    minHeight: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingHorizontal: 6,
  },
  itemEscuro: { flex: 0, paddingHorizontal: 14, borderRadius: 11 },
  ativoClaro: { backgroundColor: cores.superficie },
  ativoEscuro: { backgroundColor: cores.escuro },
  texto: { fontFamily: fontes.negrito, fontSize: tipografia.pequeno, textAlign: 'center' },
  textoEscuro: { fontFamily: fontes.extra },
});
