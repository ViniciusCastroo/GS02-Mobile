import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Chips,
  ErrorState,
  FormField,
  LoadingState,
  PrimaryButton,
  Rodape,
  Texto,
  type Opcao,
} from '../../src/components';
import { nomeDoCruzamento, useCruzamentos } from '../../src/data/cruzamentos';
import { atualizarLugar, criarLugar, excluirLugar, obterLugar } from '../../src/db/database';
import {
  DIAS_SEMANA,
  DIAS_SEMANA_EXTENSO,
  lerRotina,
  serializarRotina,
  sugerirCruzamento,
  validarLugar,
  type ErrosLugar,
} from '../../src/domain/lugar';
import { cores, espacos, fontes, raio } from '../../src/theme';
import { ETIQUETAS, type Etiqueta } from '../../src/types';

const NENHUM = 'nenhum';

const OPCOES_ETIQUETA: Opcao<Etiqueta>[] = ETIQUETAS.map((e) => ({
  valor: e,
  rotulo: e === 'Personalizada' ? '+ Personalizada' : e,
  rotuloAcessivel: e,
}));
const OPCAO_NENHUM: Opcao<string> = { valor: NENHUM, rotulo: 'Nenhum', rotuloAcessivel: 'Nenhum cruzamento, fora do estudo' };
const OPCOES_DIAS: Opcao<number>[] = DIAS_SEMANA.map((d, i) => ({ valor: i, rotulo: d, rotuloAcessivel: DIAS_SEMANA_EXTENSO[i] }));

export default function LugarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novo = id === 'novo';
  const idNumerico = novo ? null : Number(id);
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const cruzamentos = useCruzamentos();
  const [nome, setNome] = useState('');
  const [etiqueta, setEtiqueta] = useState<Etiqueta>('Casa');
  const [personalizada, setPersonalizada] = useState('');
  const [endereco, setEndereco] = useState('');
  const [localId, setLocalId] = useState<string>(NENHUM);
  const [cruzamentoManual, setCruzamentoManual] = useState(false);
  // Cruzamentos ainda não definidos pelo time de ML ficam fora da lista
  // (a não ser que o lugar já esteja ligado a um deles).
  const opcoesCruzamento: Opcao<string>[] = [
    OPCAO_NENHUM,
    ...cruzamentos
      .filter((c) => !c.placeholder || c.id === localId)
      .map((c) => ({ valor: c.id, rotulo: c.nomeCurto, rotuloAcessivel: c.nome })),
  ];
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [chegada, setChegada] = useState('08:00');
  const [saida, setSaida] = useState('18:00');
  const [erros, setErros] = useState<ErrosLugar>({});
  const [carregando, setCarregando] = useState(!novo);
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  // Posição já encontrada para o endereço salvo (reaproveitada se o endereço não mudar).
  const [original, setOriginal] = useState<{ endereco: string; latitude: number | null; longitude: number | null }>({
    endereco: '',
    latitude: null,
    longitude: null,
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: novo ? 'Novo lugar' : 'Editar lugar' });
  }, [navigation, novo]);

  useEffect(() => {
    if (novo) return;
    if (!idNumerico || Number.isNaN(idNumerico)) {
      setErroGeral('Lugar não encontrado.');
      setCarregando(false);
      return;
    }
    obterLugar(db, idNumerico)
      .then((l) => {
        if (!l) {
          setErroGeral('Lugar não encontrado. Ele pode ter sido excluído.');
          return;
        }
        const r = lerRotina(l.dias_horarios);
        setNome(l.nome);
        setEtiqueta(l.etiqueta);
        setPersonalizada(l.etiqueta_personalizada ?? '');
        setEndereco(l.endereco);
        setLocalId(l.local_id ?? NENHUM);
        setCruzamentoManual(true);
        setOriginal({ endereco: l.endereco, latitude: l.latitude, longitude: l.longitude });
        setDias(r.dias);
        setChegada(r.chegada);
        setSaida(r.saida);
      })
      .catch(() => setErroGeral('Não foi possível abrir este lugar.'))
      .finally(() => setCarregando(false));
  }, [db, idNumerico, novo]);

  function mudarEndereco(texto: string) {
    setEndereco(texto);
    if (!cruzamentoManual) setLocalId(sugerirCruzamento(texto) ?? NENHUM);
  }

  async function salvar() {
    const rotina = { dias, chegada, saida };
    const entrada = {
      nome,
      etiqueta,
      etiqueta_personalizada: etiqueta === 'Personalizada' ? personalizada : null,
      endereco,
      local_id: localId === NENHUM ? null : localId,
      dias_horarios: serializarRotina(rotina),
      ...(endereco.trim() === original.endereco.trim()
        ? { latitude: original.latitude, longitude: original.longitude }
        : { latitude: null, longitude: null }),
    };
    const encontrados = validarLugar(entrada, rotina);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setSalvando(true);
    try {
      if (novo) await criarLugar(db, entrada);
      else await atualizarLugar(db, idNumerico!, entrada);
      router.dismissTo('/');
    } catch {
      setErroGeral('Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!idNumerico) return;
    try {
      await excluirLugar(db, idNumerico);
      setConfirmarExclusao(false);
      router.dismissTo('/');
    } catch {
      setConfirmarExclusao(false);
      setErroGeral('Não foi possível excluir. Tente de novo.');
    }
  }

  if (carregando) {
    return (
      <View style={styles.conteudo}>
        <LoadingState mensagem="Abrindo o lugar…" />
      </View>
    );
  }

  const temErros = Object.keys(erros).length > 0;
  const nomeCruzamento = localId === NENHUM ? null : nomeDoCruzamento(localId);
  const ajudaEndereco = endereco.trim()
    ? nomeCruzamento
      ? `Cruzamento monitorado por perto: ${nomeCruzamento}.`
      : 'Fora dos 4 cruzamentos do estudo: este lugar vai aparecer como “Sem estimativa”.'
    : undefined;

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {erroGeral ? <ErrorState titulo="Algo deu errado" mensagem={erroGeral} /> : null}
        {temErros ? (
          <View style={styles.resumoErro} accessible accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <Texto style={{ color: cores.bloqueado, fontFamily: fontes.medio }}>
              Preencha os campos obrigatórios para salvar.
            </Texto>
          </View>
        ) : null}

        <FormField
          rotulo="Nome"
          dica="Um nome fácil de lembrar, como Escritório"
          obrigatorio
          value={nome}
          onChangeText={setNome}
          erro={erros.nome}
          placeholder="Ex.: Escritório"
          returnKeyType="next"
        />

        <View style={styles.grupo}>
          <Texto variante="baseForte">Etiqueta</Texto>
          <Chips
            titulo="Etiqueta"
            opcoes={OPCOES_ETIQUETA}
            selecionados={[etiqueta]}
            onAlternar={setEtiqueta}
          />
          {etiqueta === 'Personalizada' ? (
            <FormField
              rotulo="Nome da etiqueta"
              dica="Por exemplo: Academia"
              obrigatorio
              value={personalizada}
              onChangeText={setPersonalizada}
              erro={erros.etiqueta_personalizada}
              placeholder="Nome da etiqueta"
            />
          ) : null}
        </View>

        <FormField
          rotulo="Endereço"
          dica="Rua, número e bairro"
          obrigatorio
          value={endereco}
          onChangeText={mudarEndereco}
          erro={erros.endereco}
          ajuda={erros.endereco ? undefined : ajudaEndereco}
          placeholder="Rua, número e bairro"
        />

        <View style={styles.grupo}>
          <Texto variante="baseForte">Cruzamento do estudo</Texto>
          <Chips
            titulo="Cruzamento do estudo"
            opcoes={opcoesCruzamento}
            selecionados={[localId]}
            onAlternar={(v) => {
              setLocalId(v);
              setCruzamentoManual(true);
            }}
            dica={(o) =>
              o.valor === NENHUM
                ? 'O lugar fica fora dos 4 cruzamentos do estudo e mostra sem estimativa'
                : `Liga este lugar ao cruzamento ${o.rotuloAcessivel}`
            }
          />
          <Texto variante="pequeno">O estudo cobre só 4 cruzamentos de São Paulo.</Texto>
        </View>

        <View style={styles.grupo}>
          <Texto variante="baseForte">Dias em que costuma ir</Texto>
          <Chips
            titulo="Dias em que costuma ir"
            opcoes={OPCOES_DIAS}
            selecionados={dias}
            multiplo
            igual
            onAlternar={(d) => setDias((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d]))}
          />
        </View>

        <View style={styles.grupo}>
          <Texto variante="baseForte">Horário</Texto>
          <View style={styles.horarios}>
            <FormField
              rotulo="Chego às"
              rotuloPequeno
              dica="Horário em que você costuma chegar, como 09:00"
              value={chegada}
              onChangeText={setChegada}
              erro={erros.chegada}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <FormField
              rotulo="Saio às"
              rotuloPequeno
              dica="Horário em que você costuma sair, como 18:30"
              value={saida}
              onChangeText={setSaida}
              erro={erros.saida}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <Texto variante="pequeno">Ajuda a lembrar quando a previsão importa pra você.</Texto>
        </View>
      </ScrollView>

      <Rodape>
        <PrimaryButton
          titulo="Salvar"
          onPress={salvar}
          carregando={salvando}
          accessibilityHint="Salva este lugar no celular e volta para a lista"
        />
        {!novo && !erroGeral ? (
          <PrimaryButton
            titulo="Excluir lugar"
            variante="texto"
            corTexto={cores.bloqueadoForte}
            onPress={() => setConfirmarExclusao(true)}
            accessibilityLabel={`Excluir ${nome || 'lugar'}`}
            accessibilityHint="Pede confirmação antes de apagar este lugar"
          />
        ) : null}
      </Rodape>

      <Modal
        visible={confirmarExclusao}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmarExclusao(false)}
      >
        <Pressable
          style={styles.veu}
          onPress={() => setConfirmarExclusao(false)}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          accessibilityHint="Cancela a exclusão"
        >
          <Pressable style={styles.folhaExcluir} accessibilityViewIsModal onPress={() => {}} accessible={false}>
            <Texto variante="subtitulo" accessibilityRole="header">
              Excluir “{nome}”?
            </Texto>
            <Texto cor={cores.textoSecundario}>
              Você deixa de receber avisos para este lugar. Os alertas antigos continuam no histórico.
            </Texto>
            <PrimaryButton
              titulo="Excluir"
              variante="perigo"
              onPress={excluir}
              accessibilityHint="Apaga este lugar do celular. Não dá para desfazer"
              style={{ marginTop: 8 }}
            />
            <PrimaryButton
              titulo="Cancelar"
              variante="secundario"
              corTexto={cores.texto}
              onPress={() => setConfirmarExclusao(false)}
              accessibilityHint="Fecha sem excluir"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espacos.tela, paddingTop: 18, paddingBottom: espacos.lg, gap: 20 },
  grupo: { gap: 8 },
  horarios: { flexDirection: 'row', gap: 10 },
  resumoErro: { backgroundColor: cores.bloqueadoFundo, borderRadius: raio.md, paddingHorizontal: 14, paddingVertical: 12 },
  veu: { flex: 1, backgroundColor: 'rgba(43,36,32,0.45)', justifyContent: 'flex-end' },
  folhaExcluir: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.folha,
    borderTopRightRadius: raio.folha,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    gap: 10,
  },
});
