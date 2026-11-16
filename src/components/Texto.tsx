import { StyleSheet, Text, type TextProps } from 'react-native';
import { cores, fontes, tipografia } from '../theme';

export type VarianteTexto =
  | 'tituloTela' // 28 extra
  | 'titulo' // 24 extra
  | 'numero' // 26 extra
  | 'subtitulo' // 18 semi
  | 'subtituloForte' // 18 extra
  | 'corpo' // 17 regular, entrelinha maior
  | 'base' // 16 regular
  | 'baseForte' // 16 semi
  | 'pequeno' // 15 regular
  | 'legenda'; // 14 semi

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: string;
  centro?: boolean;
}

/** Texto padrão do app: aplica a fonte Nunito e o tamanho do tema. */
export function Texto({ variante = 'base', cor, centro, style, ...props }: Props) {
  return (
    <Text
      {...props}
      style={[estilos[variante], cor ? { color: cor } : null, centro ? { textAlign: 'center' } : null, style]}
    />
  );
}

const linha = (t: number) => Math.round(t * tipografia.alturaLinha);

const estilos = StyleSheet.create({
  tituloTela: { fontFamily: fontes.extra, fontSize: tipografia.tituloGrande, color: cores.texto },
  titulo: { fontFamily: fontes.extra, fontSize: tipografia.titulo, lineHeight: linha(tipografia.titulo) - 6, color: cores.texto },
  numero: { fontFamily: fontes.extra, fontSize: tipografia.numero, color: cores.texto },
  subtitulo: { fontFamily: fontes.semi, fontSize: tipografia.medio, color: cores.texto },
  subtituloForte: { fontFamily: fontes.extra, fontSize: tipografia.medio, color: cores.texto },
  corpo: { fontFamily: fontes.regular, fontSize: tipografia.corpo, lineHeight: linha(tipografia.corpo), color: cores.textoCorpo },
  base: { fontFamily: fontes.regular, fontSize: tipografia.base, lineHeight: linha(tipografia.base), color: cores.texto },
  baseForte: { fontFamily: fontes.semi, fontSize: tipografia.base, color: cores.texto },
  pequeno: { fontFamily: fontes.regular, fontSize: tipografia.pequeno, lineHeight: linha(tipografia.pequeno), color: cores.textoSecundario },
  legenda: { fontFamily: fontes.semi, fontSize: tipografia.legenda, color: cores.textoSecundario },
});
