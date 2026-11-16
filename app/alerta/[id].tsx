import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EmptyState,
  ErrorState,
  Folha,
  LoadingState,
  Mapa,
  PrimaryButton,
  SELOS,
  Texto,
} from '../../src/components';
import { coordenadaDoCruzamento, nomeDoCruzamento, useCruzamentos } from '../../src/data/cruzamentos';
import { obterAlerta, obterLugar } from '../../src/db/database';
import { rotuloEtiqueta } from '../../src/domain/lugar';
import {
  ehCruzamentoCoberto,
  formatarEstimativa,
  formatarHora,
  formatarPercentual,
  LIMIAR_PADRAO,
  resumoDoLugar,
  textoPrevisao,
  validadeDaPrevisao,
} from '../../src/domain/risco';
import { useRisco, type EstadoRisco } from '../../src/hooks/useRisco';
import { cores, espacos, fontes, raio } from '../../src/theme';
import type { AlertaComLugar, Lugar, RiscoResposta } from '../../src/types';

/** Escala da barra da estimativa (0 a 5%), só para desenhar o limiar. */
const ESCALA_BARRA = 0.05;

function respostaDoAlerta(a: AlertaComLugar): RiscoResposta {
  return {
    local_id: a.local_id,
    cruzamento: nomeDoCruzamento(a.local_id) ?? a.local_id,
    previsao_hora: a.previsao_hora,
    valida_ate: a.valida_ate ?? validadeDaPrevisao(a.previsao_hora),
    estimativa: a.estimativa,
    limiar: LIMIAR_PADRAO,
    status: a.status,
    confirmado_cge: a.confirmado_cge,
    confirmado_em: a.confirmado_em,
  };
}

function Bloco({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <View style={styles.bloco} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Texto variante="legenda" style={{ fontFamily: fontes.regular }}>
        {rotulo}
      </Texto>
      <Texto style={[styles.blocoValor, cor ? { color: cor } : null]}>{valor}</Texto>
    </View>
  );
}

interface DadosDetalhe {
  etiqueta: string;
  nome: string;
  localId: string | null;
  lugarId: number | null;
  resposta: RiscoResposta | null;
  /** "Atualizado às" (ao vivo) ou "Registrado às" (histórico). */
  rotuloHora: string;
  hora: string | null;
  risco?: EstadoRisco;
}

function Detalhe({ d }: { d: DadosDetalhe }) {
  useCruzamentos(); // redesenha quando os cruzamentos chegam da API
  const insets = useSafeAreaInsets();
  const resumo = resumoDoLugar(d.resposta, d.localId);
  const st = SELOS[resumo.status];
  const temEstimativa = d.resposta?.estimativa != null;
  const semCobertura = !ehCruzamentoCoberto(d.localId);
  const limiar = formatarPercentual(d.resposta?.limiar ?? LIMIAR_PADRAO, 3);
  const cruzamento = nomeDoCruzamento(d.localId) ?? 'Nenhum cruzamento monitorado por perto';
  const coordenada = coordenadaDoCruzamento(d.localId);
  const posLimiar = `${((d.resposta?.limiar ?? LIMIAR_PADRAO) / ESCALA_BARRA) * 100}%` as const;
  const preenchido = `${Math.min((d.resposta?.estimativa ?? 0) / ESCALA_BARRA, 1) * 100}%` as const;
  const confirmacao = semCobertura
    ? '—'
    : resumo.confirmado
      ? `Sim, ${formatarHora(d.resposta?.confirmado_em)}`
      : 'Não';

  return (
    <View style={styles.tela}>
      <Mapa
        altura={250 + insets.top}
        descricao={`Mapa do cruzamento ${cruzamento}. Situação: ${resumo.confirmado ? 'alagamento confirmado' : st.rotulo}.`}
        legenda={coordenada ? undefined : 'nenhum cruzamento monitorado por perto'}
        deslocamento={0.12}
        ponto={
          coordenada
            ? {
                coordenada,
                titulo: cruzamento,
                cor: resumo.confirmado ? cores.bloqueadoForte : st.ponto,
                fundo: resumo.confirmado ? cores.bloqueadoFundo : st.fundo,
                icone: resumo.confirmado ? 'close-circle' : st.icone,
              }
            : null
        }
      >
        <PrimaryButton
          titulo="‹ Voltar"
          accessibilityLabel="Voltar"
          variante="flutuante"
          compacto
          onPress={() => router.back()}
          accessibilityHint="Volta para a tela anterior"
          style={[styles.flutuante, { left: 16, top: insets.top + 12 }]}
        />
        {d.lugarId ? (
          <PrimaryButton
            titulo="Editar"
            variante="flutuante"
            corTexto={cores.destaque}
            compacto
            onPress={() => router.push(`/lugar/${d.lugarId}`)}
            accessibilityLabel={`Editar ${d.nome}`}
            accessibilityHint="Abre este lugar para editar ou excluir"
            style={[styles.flutuante, { right: 16, top: insets.top + 12 }]}
          />
        ) : null}
      </Mapa>

      <Folha>
        <ScrollView contentContainerStyle={styles.conteudo}>
          <View style={{ gap: 6 }}>
            <Texto variante="pequeno" style={{ fontFamily: fontes.negrito }}>
              {d.etiqueta} · {d.nome}
            </Texto>
            <Texto variante="titulo" accessibilityRole="header">
              {cruzamento}
            </Texto>
          </View>

          {d.risco?.carregando && !d.resposta ? <LoadingState /> : null}
          {d.risco?.erro ? (
            <ErrorState
              mensagem={
                d.risco.doCache && d.risco.atualizadoEm
                  ? `Você está vendo o último dado salvo, das ${formatarHora(d.risco.atualizadoEm)}.`
                  : 'Ainda não há previsão salva neste celular.'
              }
              onTentarNovamente={d.risco.recarregar}
            />
          ) : null}

          <View style={[styles.situacao, { backgroundColor: st.fundo }]} accessible accessibilityRole="summary">
            <View style={styles.linha}>
              <Ionicons name={st.icone} size={24} color={st.cor} />
              <Texto style={[styles.situacaoTitulo, { color: st.cor }]}>{st.rotulo}</Texto>
            </View>
            <Texto variante="corpo" cor={st.cor}>
              {resumo.confirmado ? 'A previsão já indicava risco elevado para esta hora.' : resumo.frase}
            </Texto>
            {d.resposta && !semCobertura ? (
              <Texto variante="pequeno" cor={st.cor} style={{ fontFamily: fontes.semi }}>
                {textoPrevisao(d.resposta)}
              </Texto>
            ) : null}
          </View>

          {resumo.confirmado ? (
            <View style={styles.confirmado} accessible accessibilityRole="alert">
              <View style={styles.linha}>
                <Ionicons name="close-circle" size={22} color={cores.textoSobreEscuro} />
                <Texto variante="subtituloForte" cor={cores.textoSobreEscuro} style={{ flexShrink: 1 }}>
                  Alagamento confirmado pelo CGE às {formatarHora(d.resposta?.confirmado_em)}
                </Texto>
              </View>
              <Texto cor={cores.textoSobreEscuro}>Rotas que passam por aqui estão bloqueadas.</Texto>
            </View>
          ) : null}

          <View style={styles.grade}>
            <Bloco rotulo="Estimativa" valor={semCobertura ? '—' : formatarEstimativa(d.resposta?.estimativa)} />
            <Bloco rotulo="Limiar de risco" valor={limiar} />
            <Bloco
              rotulo="Confirmação do CGE"
              valor={confirmacao}
              cor={resumo.confirmado ? cores.bloqueadoForte : undefined}
            />
            <Bloco rotulo={d.rotuloHora} valor={d.hora ? formatarHora(d.hora) : '—'} />
          </View>

          {temEstimativa ? (
            <View
              style={{ gap: 6 }}
              accessible
              accessibilityLabel={`Estimativa de ${formatarEstimativa(d.resposta?.estimativa)}, limiar de ${limiar}`}
            >
              <View style={styles.trilho}>
                <View style={[styles.preenchido, { width: preenchido, backgroundColor: st.ponto }]} />
                <View style={[styles.marcaLimiar, { left: posLimiar }]} />
              </View>
              <View style={styles.escala}>
                <Texto variante="legenda" style={{ fontFamily: fontes.regular }}>0%</Texto>
                <Texto variante="legenda" style={{ fontFamily: fontes.regular }}>{limiar}</Texto>
                <Texto variante="legenda" style={{ fontFamily: fontes.regular }}>5%</Texto>
              </View>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Texto variante="subtituloForte" style={{ fontSize: 17 }} accessibilityRole="header">
              O que esse número quer dizer?
            </Texto>
            {semCobertura ? (
              <Texto variante="corpo">
                O modelo foi treinado só para 4 cruzamentos de São Paulo. Fora deles, ou quando não há chuva medida, o
                app mostra “Sem estimativa” em vez de arriscar um número.
              </Texto>
            ) : (
              <Texto variante="corpo">
                É a chance de o CGE registrar um novo alagamento neste cruzamento na próxima hora. Parece pouco, mas
                alagamentos são raros: acima de {limiar} o risco já é considerado elevado.
              </Texto>
            )}
            <PrimaryButton
              titulo="Como funciona a estimativa ›"
              accessibilityLabel="Como funciona a estimativa"
              variante="texto"
              compacto
              onPress={() => router.push('/como-funciona')}
              accessibilityHint="Explica a estimativa, o limiar e as fontes de dados"
            />
          </View>
        </ScrollView>
        <View style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <PrimaryButton
            titulo="Ver rotas"
            grande
            onPress={() =>
              router.navigate(d.lugarId ? { pathname: '/rotas', params: { destino: String(d.lugarId) } } : '/rotas')
            }
            accessibilityHint="Abre as rotas que desviam do alagamento"
          />
        </View>
      </Folha>
    </View>
  );
}

export default function DetalheScreen() {
  const { id, lugar: lugarParam } = useLocalSearchParams<{ id: string; lugar?: string }>();
  const db = useSQLiteContext();
  const aoVivo = id === 'atual';
  const [lugar, setLugar] = useState<Lugar | null | undefined>(undefined);
  const [alerta, setAlerta] = useState<AlertaComLugar | null | undefined>(undefined);
  const risco = useRisco(aoVivo ? lugar?.local_id : null);

  useEffect(() => {
    (async () => {
      if (aoVivo) {
        setLugar(await obterLugar(db, Number(lugarParam)).catch(() => null));
        return;
      }
      const a = await obterAlerta(db, Number(id)).catch(() => null);
      setAlerta(a);
      setLugar(a ? await obterLugar(db, a.lugar_id).catch(() => null) : null);
    })();
  }, [db, id, lugarParam, aoVivo]);

  if (lugar === undefined || (!aoVivo && alerta === undefined)) {
    return (
      <View style={[styles.tela, { padding: espacos.tela, paddingTop: 80 }]}>
        <LoadingState mensagem="Abrindo…" />
      </View>
    );
  }

  if ((aoVivo && !lugar) || (!aoVivo && !alerta)) {
    return (
      <View style={[styles.tela, { justifyContent: 'center' }]}>
        <EmptyState
          icone="alert-circle-outline"
          titulo={aoVivo ? 'Lugar não encontrado' : 'Alerta não encontrado'}
          mensagem="Ele não está mais salvo neste celular."
          acao={<PrimaryButton titulo="Voltar" compacto onPress={() => router.back()} accessibilityHint="Volta para a tela anterior" />}
        />
      </View>
    );
  }

  const dados: DadosDetalhe =
    aoVivo && lugar
      ? {
          etiqueta: rotuloEtiqueta(lugar),
          nome: lugar.nome,
          localId: lugar.local_id,
          lugarId: lugar.id,
          resposta: risco.dados,
          rotuloHora: 'Atualizado às',
          hora: risco.atualizadoEm,
          risco,
        }
      : {
          etiqueta: alerta!.lugar_etiqueta ?? 'Lugar excluído',
          nome: alerta!.lugar_nome ?? 'Lugar excluído',
          localId: alerta!.local_id,
          lugarId: lugar?.id ?? null,
          resposta: respostaDoAlerta(alerta!),
          rotuloHora: 'Registrado às',
          hora: alerta!.criado_em,
        };

  return <Detalhe d={dados} />;
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  flutuante: { position: 'absolute', minHeight: 48, paddingHorizontal: 18, borderRadius: 24 },
  conteudo: { paddingHorizontal: espacos.tela, paddingTop: 10, paddingBottom: espacos.tela, gap: espacos.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  situacao: { borderRadius: raio.xl, padding: 18, gap: 8 },
  situacaoTitulo: { fontFamily: fontes.extra, fontSize: 26, flexShrink: 1 },
  confirmado: { backgroundColor: cores.bloqueadoForte, borderRadius: raio.xl, padding: 18, gap: 4 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bloco: { flexBasis: '47%', flexGrow: 1, backgroundColor: cores.fundo, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  blocoValor: { fontFamily: fontes.extra, fontSize: 20, color: cores.texto },
  trilho: { height: 14, borderRadius: 7, backgroundColor: cores.trilho, overflow: 'hidden' },
  preenchido: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 7 },
  marcaLimiar: { position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -1.5, backgroundColor: cores.escuro },
  escala: { flexDirection: 'row', justifyContent: 'space-between' },
  rodape: { paddingHorizontal: espacos.tela, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.bordaSuave },
});
