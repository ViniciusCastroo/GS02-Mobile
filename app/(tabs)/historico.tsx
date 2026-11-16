import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DemoBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
  StatusBadge,
  Texto,
  rotuloSelo,
} from '../../src/components';
import { nomeDoCruzamento, useCruzamentos } from '../../src/data/cruzamentos';
import { listarAlertas } from '../../src/db/database';
import { formatarDataExtenso, formatarEstimativa, formatarHora } from '../../src/domain/risco';
import { useSemConexao } from '../../src/state/conexao';
import { cores, espacos, raio, TOQUE_MINIMO } from '../../src/theme';
import type { AlertaComLugar } from '../../src/types';

const horaDoEvento = (a: AlertaComLugar) => (a.confirmado_cge && a.confirmado_em ? a.confirmado_em : a.previsao_hora);

function nota(a: AlertaComLugar): string {
  if (a.confirmado_cge) return 'CGE confirmou o alagamento';
  return `Estimativa ${formatarEstimativa(a.estimativa)} · previsão das ${formatarHora(a.previsao_hora)}`;
}

function AlertaLinha({ alerta, ultimo }: { alerta: AlertaComLugar; ultimo: boolean }) {
  const tipo = alerta.confirmado_cge ? 'confirmado' : alerta.status;
  const etiqueta = alerta.lugar_etiqueta ?? 'Lugar excluído';
  const cruzamento = nomeDoCruzamento(alerta.local_id) ?? alerta.local_id;
  const hora = formatarHora(horaDoEvento(alerta));
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/alerta/[id]', params: { id: String(alerta.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${hora}, ${etiqueta}. ${rotuloSelo(tipo)}. ${cruzamento}. ${nota(alerta)}`}
      accessibilityHint="Abre o detalhe deste alerta"
      style={({ pressed }) => [styles.linha, !ultimo && styles.divisoria, pressed && { opacity: 0.8 }]}
    >
      <Texto variante="subtitulo" style={styles.hora}>
        {hora}
      </Texto>
      <View style={styles.corpo}>
        <View style={styles.topo}>
          <Texto variante="subtitulo" style={{ fontSize: 17, flexShrink: 1 }}>
            {etiqueta}
          </Texto>
          <StatusBadge tipo={tipo} compacto />
        </View>
        <Texto variante="pequeno">{cruzamento}</Texto>
        <Texto variante="pequeno" cor={cores.textoCorpo}>
          {nota(alerta)}
        </Texto>
      </View>
    </Pressable>
  );
}

export default function HistoricoScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const semConexao = useSemConexao();
  const cruzamentos = useCruzamentos();
  const [alertas, setAlertas] = useState<AlertaComLugar[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    listarAlertas(db)
      .then((a) => {
        setAlertas(a);
        setErro(null);
      })
      .catch(() => setErro('Não foi possível ler o histórico salvo.'));
  }, [db]);

  useFocusEffect(carregar);

  const secoes = useMemo(() => {
    const grupos = new Map<string, AlertaComLugar[]>();
    for (const a of alertas ?? []) {
      const chave = formatarDataExtenso(horaDoEvento(a));
      grupos.set(chave, [...(grupos.get(chave) ?? []), a]);
    }
    return [...grupos].map(([titulo, data]) => ({ titulo, data }));
  }, [alertas]);

  return (
    <View style={[styles.tela, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecalho}>
        <ScreenHeader titulo="Histórico" subtitulo="Salvo neste celular. Funciona sem internet." />
        <DemoBadge />
      </View>
      <SectionList
        sections={secoes}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={[styles.lista, secoes.length === 0 && { flexGrow: 1 }]}
        stickySectionHeadersEnabled={false}
        extraData={cruzamentos}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 8 }}>
            {semConexao ? (
              <ErrorState
                titulo="Você está sem internet"
                mensagem="Os alertas abaixo estão salvos no celular. Novos avisos chegam quando a conexão voltar."
              />
            ) : null}
            {erro ? <ErrorState titulo="Algo deu errado" mensagem={erro} onTentarNovamente={carregar} /> : null}
            {alertas === null && !erro ? <LoadingState mensagem="Carregando o histórico…" /> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Texto variante="legenda" accessibilityRole="header" style={styles.data}>
            {section.titulo}
          </Texto>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.bloco,
              index === 0 && styles.blocoTopo,
              index === section.data.length - 1 && styles.blocoFim,
            ]}
          >
            <AlertaLinha alerta={item} ultimo={index === section.data.length - 1} />
          </View>
        )}
        renderSectionFooter={() => <View style={{ height: 18 }} />}
        ListEmptyComponent={
          alertas !== null ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 60 }}>
              <EmptyState
                icone="notifications-off-outline"
                titulo="Nenhum alerta ainda"
                mensagem="Quando um lugar salvo ficar com risco elevado ou o CGE confirmar um alagamento, o alerta aparece aqui."
              />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: espacos.tela, paddingBottom: 14, gap: 8 },
  lista: { paddingHorizontal: espacos.tela, paddingBottom: espacos.tela },
  data: { marginBottom: 8 },
  bloco: {
    backgroundColor: cores.superficie,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: cores.bordaSuave,
    paddingHorizontal: espacos.md,
  },
  blocoTopo: { borderTopWidth: 1, borderTopLeftRadius: raio.xl, borderTopRightRadius: raio.xl },
  blocoFim: { borderBottomWidth: 1, borderBottomLeftRadius: raio.xl, borderBottomRightRadius: raio.xl },
  linha: { flexDirection: 'row', gap: 10, paddingVertical: 14, minHeight: TOQUE_MINIMO },
  divisoria: { borderBottomWidth: 1, borderBottomColor: cores.divisoria },
  hora: { width: 52, fontSize: 17 },
  corpo: { flex: 1, gap: 6, minWidth: 0 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
