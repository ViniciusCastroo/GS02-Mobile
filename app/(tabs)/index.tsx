import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  CartoesCarregando,
  DemoBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
  StatusBadge,
  Texto,
  rotuloSelo,
} from '../../src/components';
import { CRUZAMENTO_DEMO, useCruzamentos } from '../../src/data/cruzamentos';
import { listarLugares } from '../../src/db/database';
import { rotuloEtiqueta } from '../../src/domain/lugar';
import { formatarHora, resumoDoLugar, textoAtualizado, textoPrevisao } from '../../src/domain/risco';
import { useRisco } from '../../src/hooks/useRisco';
import { cores, espacos } from '../../src/theme';
import type { Lugar } from '../../src/types';

function abrirDetalhe(lugar: Lugar) {
  router.push({ pathname: '/alerta/[id]', params: { id: 'atual', lugar: String(lugar.id) } });
}

function LugarItem({ lugar }: { lugar: Lugar }) {
  const risco = useRisco(lugar.local_id);
  const resumo = resumoDoLugar(risco.dados, lugar.local_id);
  const etiqueta = rotuloEtiqueta(lugar);
  const carregandoSemDado = risco.carregando && !risco.dados && !risco.semCobertura;
  const nota = carregandoSemDado ? 'Buscando a previsão…' : resumo.nota;

  return (
    <Card
      onPress={() => abrirDetalhe(lugar)}
      accessibilityLabel={`${etiqueta}: ${lugar.nome}. ${lugar.endereco}. ${rotuloSelo(resumo.status)}. ${nota}`}
      accessibilityHint="Abre o detalhe do risco neste lugar"
    >
      <View style={styles.topo}>
        <View style={styles.textos}>
          <Texto variante="legenda">{etiqueta}</Texto>
          <Texto variante="subtitulo">{lugar.nome}</Texto>
          <Texto cor={cores.textoSecundario}>{lugar.endereco}</Texto>
        </View>
        <StatusBadge tipo={resumo.status} />
      </View>
      <View style={styles.nota}>
        <Texto variante="pequeno" cor={resumo.confirmado ? cores.bloqueado : cores.textoTerciario}>
          {nota}
        </Texto>
      </View>
    </Card>
  );
}

export default function MeusLugaresScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  // Redesenha a lista quando os cruzamentos chegam da API.
  const cruzamentos = useCruzamentos();
  // A previsão é horária e igual para todos os cruzamentos: o cabeçalho mostra a do cruzamento monitorado.
  const previsao = useRisco(CRUZAMENTO_DEMO);
  const [lugares, setLugares] = useState<Lugar[] | null>(null);
  const [erroBanco, setErroBanco] = useState<string | null>(null);

  const carregar = useCallback(() => {
    listarLugares(db)
      .then((l) => {
        setLugares(l);
        setErroBanco(null);
      })
      .catch(() => setErroBanco('Não foi possível ler seus lugares salvos.'));
  }, [db]);

  useFocusEffect(carregar);

  const carregando = lugares === null || (previsao.carregando && !previsao.dados && !previsao.erro);
  const vazio = !carregando && lugares !== null && lugares.length === 0;
  const irAdicionar = () => router.push('/lugar/novo');
  const irComoFunciona = () => router.push('/como-funciona');

  const mensagemErro =
    previsao.doCache && previsao.atualizadoEm
      ? `Você está vendo o último dado salvo, das ${formatarHora(previsao.atualizadoEm)}. A gente tenta de novo a cada 15 minutos.`
      : 'Ainda não há previsão salva neste celular. A gente tenta de novo a cada 15 minutos.';

  return (
    <View style={[styles.tela, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecalho}>
        <ScreenHeader
          titulo="Meus lugares"
          acao={
            <PrimaryButton
              titulo="Ajuda"
              variante="secundario"
              compacto
              onPress={irComoFunciona}
              accessibilityHint="Abre a explicação de como o Rota Seca funciona"
              style={styles.ajuda}
            />
          }
        />
        <DemoBadge />
        {carregando ? <LoadingState /> : null}
        {!carregando && previsao.dados && !vazio ? (
          <View style={{ gap: 2 }}>
            <Texto variante="pequeno">
              {textoPrevisao(previsao.dados)}
            </Texto>
            <Texto variante="pequeno">
              {textoAtualizado(previsao.atualizadoEm)}
              {previsao.erro ? ' · sem conexão' : ''}
            </Texto>
          </View>
        ) : null}
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={[styles.lista, vazio && { flexGrow: 1 }]}
        data={carregando ? [] : (lugares ?? [])}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <LugarItem lugar={item} />}
        extraData={cruzamentos}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: carregando || vazio ? 0 : 10 }}>
            {erroBanco ? <ErrorState titulo="Algo deu errado" mensagem={erroBanco} onTentarNovamente={carregar} /> : null}
            {previsao.erro && !carregando ? (
              <ErrorState mensagem={mensagemErro} onTentarNovamente={previsao.recarregar} />
            ) : null}
            {carregando ? <CartoesCarregando /> : null}
          </View>
        }
        ListFooterComponent={
          !carregando && !vazio ? (
            <PrimaryButton
              titulo="+ Adicionar lugar"
              accessibilityLabel="Adicionar lugar"
              variante="tracejado"
              onPress={irAdicionar}
              accessibilityHint="Abre o formulário para salvar um novo lugar"
              style={{ marginTop: 10 }}
            />
          ) : undefined
        }
        ListEmptyComponent={
          vazio ? (
            <View style={styles.vazio}>
              <EmptyState
                titulo="Nenhum lugar por aqui ainda"
                mensagem="Salve os lugares onde você costuma ir e a gente avisa quando a chuva puder alagar o caminho."
                acao={
                  <View style={{ gap: 6, alignSelf: 'stretch', alignItems: 'center' }}>
                    <PrimaryButton
                      titulo="Adicionar lugar"
                      compacto
                      onPress={irAdicionar}
                      accessibilityHint="Abre o formulário para salvar seu primeiro lugar"
                      style={{ alignSelf: 'center', paddingHorizontal: 28, marginTop: 6 }}
                    />
                    <PrimaryButton
                      titulo="Como funciona o Rota Seca"
                      variante="texto"
                      compacto
                      onPress={irComoFunciona}
                      accessibilityHint="Explica a previsão de alagamento"
                      style={{ alignSelf: 'center' }}
                    />
                  </View>
                }
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
  cabecalho: { paddingHorizontal: espacos.tela, paddingBottom: 14, gap: 10 },
  ajuda: { minHeight: 48, paddingHorizontal: 18 },
  lista: { paddingHorizontal: espacos.tela, paddingBottom: espacos.tela },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  textos: { flex: 1, gap: 2, minWidth: 0 },
  nota: { borderTopWidth: 1, borderTopColor: cores.divisoria, paddingTop: 10 },
  vazio: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
});
