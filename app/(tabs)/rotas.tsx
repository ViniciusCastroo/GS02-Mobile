import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ErrorState,
  Folha,
  LoadingState,
  Mapa,
  PrimaryButton,
  SELOS,
  Segmented,
  StatusBadge,
  Texto,
  rotuloSelo,
  type LinhaMapa,
  type Opcao,
  type PontoMapa,
} from '../../src/components';
import { MODO_DEMO } from '../../src/config';
import { CRUZAMENTO_DEMO, useCruzamentos } from '../../src/data/cruzamentos';
import { listarLugares } from '../../src/db/database';
import { rotuloEtiqueta } from '../../src/domain/lugar';
import { formatarHora, situacaoRotaPrincipal, textoAtualizado, textoPrevisao } from '../../src/domain/risco';
import {
  classificarRotas,
  descreverMedidas,
  fonteDasRotas,
  rotuloTempo,
  formatarDistancia,
  formatarDuracao,
  linkNavegacao,
  pontoDoMeio,
  type ModoRota,
  type RotaClassificada,
} from '../../src/domain/rota';
import { useRisco } from '../../src/hooks/useRisco';
import { useRotas, type PontoTrajeto } from '../../src/hooks/useRotas';
import { definirMomento, useReplay } from '../../src/state/replay';
import { cores, espacos, fontes, raio, sombra, TOQUE_MINIMO } from '../../src/theme';
import type { Lugar, MomentoReplay, RiscoResposta, SituacaoRota } from '../../src/types';

const MODOS: Opcao<ModoRota>[] = [
  { valor: 'a_pe', rotulo: 'A pé' },
  { valor: 'moto_bike', rotulo: 'Moto e bike' },
  { valor: 'carro_onibus', rotulo: 'Carro e ônibus' },
];

const MOMENTOS: Opcao<MomentoReplay>[] = [
  { valor: '18:00', rotulo: '18:00', rotuloAcessivel: '18 horas, aviso da previsão' },
  { valor: '18:48', rotulo: '18:48', rotuloAcessivel: '18 horas e 48 minutos, CGE confirma o alagamento' },
];

const MINHA: PontoTrajeto = { tipo: 'minha' };
const nomePonto = (p: PontoTrajeto | null) =>
  !p ? 'Escolher' : p.tipo === 'minha' ? 'Minha localização' : p.lugar.nome;
const mesmoPonto = (a: PontoTrajeto | null, b: PontoTrajeto | null) =>
  !!a && !!b && (a.tipo === 'minha' ? b.tipo === 'minha' : b.tipo === 'lugar' && b.lugar.id === a.lugar.id);

const COR_LINHA: Record<SituacaoRota, string> = {
  bloqueada: cores.bloqueadoForte,
  aviso: cores.avisoPonto,
  recomendada: cores.recomendadaFundo,
  normal: cores.normalPonto,
  sem_estimativa: cores.textoTerciario,
};

function cartaoMapa(dados: RiscoResposta | null) {
  const situacao = situacaoRotaPrincipal(dados);
  if (situacao === 'bloqueada') {
    return {
      fundo: cores.bloqueadoForte,
      texto: cores.textoSobreEscuro,
      ponto: cores.bloqueadoForte,
      icone: 'close-circle' as const,
      titulo: 'Alagamento na Nações Unidas',
      frase: `Confirmado pelo CGE${dados?.confirmado_em ? ` às ${formatarHora(dados.confirmado_em)}` : ''}. Siga pela rota alternativa.`,
    };
  }
  if (situacao === 'aviso') {
    return {
      fundo: cores.avisoFundo,
      texto: cores.aviso,
      ponto: cores.avisoPonto,
      icone: 'warning' as const,
      titulo: 'Risco elevado na Nações Unidas',
      frase: `Pode alagar até as ${formatarHora(dados?.valida_ate)}. Ainda dá pra passar, mas fique de olho.`,
    };
  }
  const s = SELOS[situacao === 'normal' ? 'normal' : 'sem_estimativa'];
  return {
    fundo: s.fundo,
    texto: s.cor,
    ponto: s.ponto,
    icone: s.icone,
    titulo: situacao === 'normal' ? 'Tudo tranquilo na Nações Unidas' : 'Sem estimativa agora',
    frase:
      situacao === 'normal'
        ? 'Sem risco elevado de alagamento na próxima hora.'
        : 'Não há previsão para o cruzamento monitorado agora.',
  };
}

function RotaCartao(props: { rota: RotaClassificada; selecionada: boolean; onSelecionar: () => void }) {
  const { rota, selecionada, onSelecionar } = props;
  const bloqueada = rota.situacao === 'bloqueada';
  const corNota =
    rota.situacao === 'bloqueada' ? cores.bloqueado : rota.situacao === 'aviso' ? cores.aviso : cores.textoTerciario;
  return (
    <Pressable
      onPress={onSelecionar}
      disabled={bloqueada}
      accessibilityRole="radio"
      accessibilityLabel={`${rota.nome}. ${rotuloSelo(rota.situacao)}. ${descreverMedidas(rota)}. ${rota.nota}`}
      accessibilityHint={bloqueada ? 'Esta rota está bloqueada e não pode ser escolhida' : 'Escolhe esta rota'}
      accessibilityState={{ selected: selecionada, checked: selecionada, disabled: bloqueada }}
      style={[
        styles.rota,
        rota.situacao === 'recomendada' && styles.rotaRecomendada,
        selecionada && styles.rotaSelecionada,
        bloqueada && { opacity: 0.85 },
      ]}
    >
      <View style={styles.rotaTopo}>
        <View style={styles.tempo}>
          <Texto variante="numero" style={bloqueada ? styles.riscado : undefined}>
            {formatarDuracao(rota.duracao_s)}
          </Texto>
          <Texto variante="pequeno" cor={rota.comTransito ? cores.textoSecundario : cores.aviso}>
            {rotuloTempo(rota)}
          </Texto>
        </View>
        <StatusBadge tipo={rota.situacao} />
      </View>
      <Texto style={styles.rotaNome}>
        {rota.nome} · {formatarDistancia(rota.distancia_m)}
      </Texto>
      <Texto variante="pequeno" cor={corNota}>
        {rota.nota}
      </Texto>
    </Pressable>
  );
}

/** Painel inferior para escolher a origem ou o destino. */
function SeletorPonto(props: {
  visivel: boolean;
  titulo: string;
  papel: 'origem' | 'destino';
  lugares: Lugar[];
  atual: PontoTrajeto | null;
  onEscolher: (p: PontoTrajeto) => void;
  onFechar: () => void;
}) {
  const { visivel, titulo, papel, lugares, atual, onEscolher, onFechar } = props;
  const opcoes: PontoTrajeto[] = [MINHA, ...lugares.map((lugar) => ({ tipo: 'lugar' as const, lugar }))];
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <Pressable style={styles.veu} onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar" accessibilityHint="Fecha sem mudar">
        <Pressable style={styles.folhaSeletor} accessibilityViewIsModal onPress={() => {}} accessible={false}>
          <Texto variante="subtitulo" accessibilityRole="header">
            {titulo}
          </Texto>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 8 }}>
            {opcoes.map((p) => {
              const ativo = mesmoPonto(p, atual);
              const nome = nomePonto(p);
              const detalhe = p.tipo === 'minha' ? 'Usa o GPS do celular' : `${rotuloEtiqueta(p.lugar)} · ${p.lugar.endereco}`;
              return (
                <Pressable
                  key={p.tipo === 'minha' ? 'minha' : p.lugar.id}
                  onPress={() => onEscolher(p)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${nome}. ${detalhe}`}
                  accessibilityHint={`Usa ${nome} como ${papel}`}
                  accessibilityState={{ selected: ativo, checked: ativo }}
                  style={[styles.opcao, ativo && styles.opcaoAtiva]}
                >
                  <Ionicons
                    name={p.tipo === 'minha' ? 'locate' : 'location'}
                    size={22}
                    color={ativo ? cores.destaque : cores.textoSecundario}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="baseForte">{nome}</Texto>
                    <Texto variante="pequeno" numberOfLines={1}>
                      {detalhe}
                    </Texto>
                  </View>
                  {ativo ? <Ionicons name="checkmark-circle" size={22} color={cores.destaque} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <PrimaryButton
            titulo="Cancelar"
            variante="secundario"
            corTexto={cores.texto}
            onPress={onFechar}
            accessibilityHint="Fecha sem mudar"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RotasScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ destino?: string }>();
  const { momento } = useReplay();
  const [modo, setModo] = useState<ModoRota>('carro_onibus');
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [origem, setOrigem] = useState<PontoTrajeto | null>(null);
  const [destino, setDestino] = useState<PontoTrajeto | null>(null);
  const [editando, setEditando] = useState<'origem' | 'destino' | null>(null);
  const [escolhida, setEscolhida] = useState<string | null>(null);

  const cruzamento = useCruzamentos().find((c) => c.id === CRUZAMENTO_DEMO) ?? null;
  const risco = useRisco(CRUZAMENTO_DEMO);

  // Lugares salvos: recarrega ao voltar para a aba e mantém a escolha atualizada.
  useFocusEffect(
    useCallback(() => {
      listarLugares(db)
        .then((ls) => {
          setLugares(ls);
          // Troca o lugar escolhido pela versão mais recente (ou some, se foi excluído).
          const atualizar = (p: PontoTrajeto | null): PontoTrajeto | null => {
            if (p?.tipo !== 'lugar') return p;
            const novo = ls.find((l) => l.id === p.lugar.id);
            return novo ? { tipo: 'lugar', lugar: novo } : null;
          };
          setOrigem((o) => atualizar(o) ?? padrao(ls, 'Casa', 0));
          setDestino((d) => atualizar(d) ?? padrao(ls, 'Trabalho', 1));
        })
        .catch(() => setLugares([]));
    }, [db]),
  );

  // "Ver rotas" de um lugar/alerta abre com ele como destino.
  useEffect(() => {
    const id = Number(params.destino);
    const l = lugares.find((x) => x.id === id);
    if (l) setDestino({ tipo: 'lugar', lugar: l });
  }, [params.destino, lugares]);

  const calculo = useRotas(origem, destino, modo, cruzamento?.coordenada ?? null);
  const rotas = useMemo(
    () =>
      classificarRotas(
        calculo.rotas,
        cruzamento?.coordenada ? { coordenada: cruzamento.coordenada, nomeCurto: cruzamento.nomeCurto, via: cruzamento.via } : null,
        risco.dados,
      ),
    [calculo.rotas, cruzamento, risco.dados],
  );
  const livres = rotas.filter((r) => r.situacao !== 'bloqueada');
  const selecionada = livres.find((r) => r.id === escolhida) ?? livres[0] ?? null;
  const mapa = cartaoMapa(risco.dados);
  const nomeModo = MODOS.find((m) => m.valor === modo)?.rotulo ?? '';

  const linhas: LinhaMapa[] = rotas.map((r) => ({
    id: r.id,
    coordenadas: r.geometria,
    cor: r.id === selecionada?.id ? cores.destaque : COR_LINHA[r.situacao],
    largura: r.id === selecionada?.id ? 6 : 4,
    tracejada: r.situacao === 'bloqueada',
    destaque: r.id === selecionada?.id,
  }));
  const marcadores: PontoMapa[] = [
    ...(calculo.origem
      ? [{ coordenada: calculo.origem, titulo: `Origem: ${nomePonto(origem)}`, cor: cores.textoSobreEscuro, fundo: cores.escuro, icone: 'ellipse' as const }]
      : []),
    ...(calculo.destino
      ? [{ coordenada: calculo.destino, titulo: `Destino: ${nomePonto(destino)}`, cor: cores.textoSobreEscuro, fundo: cores.escuro, icone: 'flag' as const }]
      : []),
  ];

  const trocarMomento = (m: MomentoReplay) => {
    definirMomento(m);
    setEscolhida(null);
  };

  const inverter = () => {
    setOrigem(destino);
    setDestino(origem);
    setEscolhida(null);
  };

  const ir = async () => {
    if (!selecionada || !calculo.origem || !calculo.destino) return;
    const via = selecionada.passaPeloCruzamento ? null : (selecionada.via ?? pontoDoMeio(selecionada.geometria));
    const url = linkNavegacao(calculo.origem, calculo.destino, modo, via);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não deu para abrir o mapa', 'Instale o Google Maps ou abra o link no navegador.');
    }
  };

  const descricaoMapa = `Mapa do trajeto de ${nomePonto(origem)} até ${nomePonto(destino)}, com ${rotas.length} rota${rotas.length === 1 ? '' : 's'}. ${mapa.titulo}.`;

  return (
    <View style={styles.tela}>
      <Mapa
        altura={300 + insets.top}
        descricao={descricaoMapa}
        margemTopo={insets.top + (MODO_DEMO ? 150 : 100)}
        deslocamento={0.3}
        linhas={linhas}
        marcadores={marcadores}
        ponto={
          cruzamento?.coordenada
            ? { coordenada: cruzamento.coordenada, titulo: mapa.titulo, cor: mapa.ponto, fundo: cores.superficie, icone: mapa.icone }
            : null
        }
        legenda="mapa do trajeto"
      >
        <View style={[styles.sobreMapa, { top: insets.top + 8 }]} pointerEvents="box-none">
          <View
            style={[styles.cartaoMapa, { backgroundColor: mapa.fundo }]}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${mapa.titulo}. ${mapa.frase}`}
          >
            <View style={styles.linha}>
              <Ionicons name={mapa.icone} size={20} color={mapa.texto} />
              <Texto variante="subtituloForte" cor={mapa.texto} style={{ flexShrink: 1 }}>
                {mapa.titulo}
              </Texto>
            </View>
            <Texto variante="pequeno" cor={mapa.texto}>
              {mapa.frase}
            </Texto>
          </View>
          {MODO_DEMO ? (
            <View style={styles.replay} pointerEvents="box-none">
              <View style={styles.seloReplay}>
                <Texto variante="legenda" style={{ fontFamily: fontes.negrito }}>
                  {'Replay\n16/01/2025'}
                </Texto>
              </View>
              <Segmented
                titulo="Horário do replay de 16/01/2025"
                opcoes={MOMENTOS}
                valor={momento}
                onChange={trocarMomento}
                estilo="escuro"
                dica={(o) => `Mostra a situação às ${o.valor} do dia 16/01/2025`}
              />
            </View>
          ) : null}
        </View>
      </Mapa>

      <Folha>
        <ScrollView contentContainerStyle={styles.conteudo}>
          <View style={styles.trajeto}>
            <View style={{ flex: 1, gap: 6 }}>
              <Pressable
                onPress={() => setEditando('origem')}
                accessibilityRole="button"
                accessibilityLabel={`Origem: ${nomePonto(origem)}`}
                accessibilityHint="Escolhe de onde você vai sair"
                style={styles.pontoTrajeto}
              >
                <Ionicons name="ellipse-outline" size={18} color={cores.texto} />
                <Texto variante="subtituloForte" numberOfLines={1} style={{ flex: 1 }}>
                  {nomePonto(origem)}
                </Texto>
                <Ionicons name="chevron-down" size={18} color={cores.textoTerciario} />
              </Pressable>
              <Pressable
                onPress={() => setEditando('destino')}
                accessibilityRole="button"
                accessibilityLabel={`Destino: ${nomePonto(destino)}`}
                accessibilityHint="Escolhe para onde você vai"
                style={styles.pontoTrajeto}
              >
                <Ionicons name="flag" size={18} color={cores.texto} />
                <Texto variante="subtituloForte" numberOfLines={1} style={{ flex: 1 }}>
                  {nomePonto(destino)}
                </Texto>
                <Ionicons name="chevron-down" size={18} color={cores.textoTerciario} />
              </Pressable>
            </View>
            <Pressable
              onPress={inverter}
              accessibilityRole="button"
              accessibilityLabel="Inverter origem e destino"
              accessibilityHint="Troca o ponto de saída pelo de chegada"
              style={styles.inverter}
            >
              <Ionicons name="swap-vertical" size={24} color={cores.destaque} />
            </Pressable>
          </View>

          <Segmented
            titulo="Como você vai"
            opcoes={MODOS}
            valor={modo}
            onChange={(m) => {
              setModo(m);
              setEscolhida(null);
            }}
            dica={(o) => `Calcula as rotas para quem vai ${o.rotulo.toLowerCase()}`}
          />

          {risco.erro ? (
            <ErrorState
              mensagem={
                risco.doCache && risco.atualizadoEm
                  ? `Mostrando a última previsão salva, das ${formatarHora(risco.atualizadoEm)}.`
                  : 'Ainda não há previsão salva neste celular.'
              }
              onTentarNovamente={risco.recarregar}
            />
          ) : null}

          {calculo.carregando ? <LoadingState mensagem="Calculando as rotas…" /> : null}
          {calculo.erro ? (
            <ErrorState titulo="Não deu para calcular as rotas" mensagem={calculo.erro} onTentarNovamente={calculo.recarregar} />
          ) : null}

          {!calculo.carregando && rotas.length > 0 ? (
            <View accessibilityRole="radiogroup" accessibilityLabel="Rotas disponíveis" style={{ gap: 12 }}>
              {rotas.map((r) => (
                <RotaCartao
                  key={r.id}
                  rota={r}
                  selecionada={selecionada?.id === r.id}
                  onSelecionar={() => setEscolhida(r.id)}
                />
              ))}
            </View>
          ) : null}

          {!calculo.carregando && calculo.semDesvio ? (
            <Texto variante="pequeno" cor={cores.aviso}>
              Não achamos um caminho que desvie do cruzamento para este modo.
            </Texto>
          ) : null}

          <View style={{ gap: 2, paddingHorizontal: 4 }}>
            {risco.dados ? (
              <Texto variante="pequeno">
                {textoPrevisao(risco.dados)} · {textoAtualizado(risco.atualizadoEm)}
              </Texto>
            ) : null}
            {rotas.length > 0 ? (
              <Texto variante="pequeno">{fonteDasRotas(rotas, modo)}</Texto>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.rodape}>
          <PrimaryButton
            titulo={selecionada ? `Ir ${selecionada.passaPeloCruzamento ? `pela ${cruzamento?.via}` : 'pela rota alternativa'}` : 'Sem rota livre'}
            grande
            desabilitado={!selecionada}
            onPress={ir}
            accessibilityHint={`Abre o Google Maps com esta rota, ${nomeModo.toLowerCase()}`}
          />
        </View>
      </Folha>

      <SeletorPonto
        visivel={editando !== null}
        titulo={editando === 'origem' ? 'Escolha a origem' : 'Escolha o destino'}
        papel={editando ?? 'origem'}
        lugares={lugares}
        atual={editando === 'origem' ? origem : destino}
        onFechar={() => setEditando(null)}
        onEscolher={(p) => {
          if (editando === 'origem') setOrigem(p);
          else setDestino(p);
          setEscolhida(null);
          setEditando(null);
        }}
      />
    </View>
  );
}

/** Origem/destino iniciais: o lugar com a etiqueta pedida, ou o da posição indicada. */
function padrao(lugares: Lugar[], etiqueta: string, indice: number): PontoTrajeto | null {
  const l = lugares.find((x) => x.etiqueta === etiqueta) ?? lugares[indice];
  return l ? { tipo: 'lugar', lugar: l } : null;
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  sobreMapa: { position: 'absolute', left: 12, right: 12, gap: 8 },
  cartaoMapa: { borderRadius: raio.lg, paddingHorizontal: espacos.md, paddingVertical: 14, gap: 3, ...sombra.leve },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  seloReplay: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: raio.pilula, backgroundColor: cores.superficie },
  conteudo: { paddingHorizontal: espacos.md, paddingTop: 8, paddingBottom: espacos.md, gap: 12 },
  trajeto: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pontoTrajeto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: TOQUE_MINIMO,
    paddingHorizontal: 12,
    borderRadius: raio.md,
    backgroundColor: cores.fundo,
  },
  inverter: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    borderRadius: TOQUE_MINIMO / 2,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rota: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.bordaSuave,
    borderRadius: raio.lg,
    paddingHorizontal: espacos.md,
    paddingVertical: 14,
    gap: 6,
    minHeight: TOQUE_MINIMO,
  },
  rotaRecomendada: { borderWidth: 2, borderColor: cores.recomendadaFundo },
  rotaSelecionada: { backgroundColor: cores.destaqueFundo, borderWidth: 2.5, borderColor: cores.destaque },
  tempo: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1, flexWrap: 'wrap' },
  rotaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rotaNome: { fontFamily: fontes.negrito, fontSize: 17 },
  riscado: { textDecorationLine: 'line-through' },
  rodape: { paddingHorizontal: espacos.md, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: cores.bordaSuave },
  veu: { flex: 1, backgroundColor: 'rgba(43,36,32,0.45)', justifyContent: 'flex-end' },
  folhaSeletor: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.folha,
    borderTopRightRadius: raio.folha,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    gap: 12,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.bordaSuave,
  },
  opcaoAtiva: { borderColor: cores.destaque, borderWidth: 2, backgroundColor: cores.destaqueFundo },
});
