import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { StatusBadge, Texto } from '../src/components';
import { MODO_DEMO } from '../src/config';
import { formatarPercentual, LIMIAR_PADRAO } from '../src/domain/risco';
import { definirSemConexao, useReplay } from '../src/state/replay';
import { cores, espacos, fontes, TOQUE_MINIMO } from '../src/theme';

function Passo({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.passo}>
      <Texto style={styles.numero} accessibilityElementsHidden importantForAccessibility="no">
        {numero}
      </Texto>
      <View style={styles.passoCorpo}>
        <Texto variante="subtitulo" accessibilityRole="header">
          {titulo}
        </Texto>
        {children}
      </View>
    </View>
  );
}

export default function ComoFuncionaScreen() {
  const limiar = formatarPercentual(LIMIAR_PADRAO, 3);
  const { semConexao } = useReplay();
  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Passo numero="01" titulo="A estimativa">
        <Texto variante="corpo">
          Um modelo de aprendizado de máquina calcula a chance de o CGE registrar um novo alagamento no cruzamento na
          próxima hora, a partir da chuva medida e do histórico de ocorrências.
        </Texto>
      </Passo>

      <Passo numero="02" titulo={`O limiar de ${limiar}`}>
        <Texto variante="corpo">Alagamentos são raros em uma hora qualquer, então números pequenos já importam.</Texto>
        <View style={styles.exemplo}>
          <StatusBadge tipo="elevado" compacto />
          <Texto variante="pequeno" cor={cores.textoCorpo}>
            acima de {limiar}
          </Texto>
        </View>
        <View style={styles.exemplo}>
          <StatusBadge tipo="normal" compacto />
          <Texto variante="pequeno" cor={cores.textoCorpo}>
            até {limiar}
          </Texto>
        </View>
      </Passo>

      <Passo numero="03" titulo="Aviso não é bloqueio">
        <Texto variante="corpo">
          A previsão gera só um aviso. Uma rota fica bloqueada apenas quando o CGE (Centro de Gerenciamento de
          Emergências Climáticas da Prefeitura) confirma a ocorrência.
        </Texto>
        <View style={styles.exemplo}>
          <StatusBadge tipo="aviso" compacto />
          <StatusBadge tipo="bloqueada" compacto />
        </View>
      </Passo>

      <Passo numero="04" titulo="Quando atualiza">
        <Texto variante="corpo">A previsão vale por uma hora. O app consulta o servidor a cada 15 minutos.</Texto>
      </Passo>

      <Passo numero="05" titulo="Onde funciona">
        <Texto variante="corpo">
          O estudo cobre 4 cruzamentos de São Paulo. Fora deles, ou sem chuva medida, aparece “Sem estimativa”.
        </Texto>
        <View style={styles.exemplo}>
          <StatusBadge tipo="sem_estimativa" compacto />
        </View>
      </Passo>

      <View style={styles.fontes}>
        <Texto variante="legenda" accessibilityRole="header">
          Fontes de dados
        </Texto>
        <Texto cor={cores.textoCorpo}>Ocorrências de alagamento: CGE, Prefeitura de São Paulo</Texto>
        <Texto cor={cores.textoCorpo}>Chuva medida: INMET (Instituto Nacional de Meteorologia)</Texto>
        <Texto cor={cores.textoCorpo}>
          Pluviômetros: CEMADEN (Centro Nacional de Monitoramento e Alertas de Desastres Naturais)
        </Texto>
      </View>

      {MODO_DEMO ? (
        <View style={styles.fontes}>
          <Texto variante="legenda" accessibilityRole="header">
            Demonstração
          </Texto>
          <Texto cor={cores.textoCorpo}>
            O app traz o replay de um caso real de 16/01/2025: às 18:00 ele avisou sobre o cruzamento Av. das Nações
            Unidas × R. Jaime de Oliveira Souza, e às 18:48 o CGE registrou o alagamento. Troque o horário na aba Rotas.
          </Texto>
          <View style={styles.linhaSwitch}>
            <Texto style={{ flex: 1 }}>Simular sem internet</Texto>
            <Switch
              value={semConexao}
              onValueChange={definirSemConexao}
              accessibilityRole="switch"
              accessibilityLabel="Simular sem internet"
              accessibilityHint="Liga ou desliga a falta de internet para testar o último dado salvo"
              accessibilityState={{ checked: semConexao }}
              trackColor={{ true: cores.destaque, false: cores.borda }}
              thumbColor={cores.superficie}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espacos.tela, paddingTop: espacos.tela, paddingBottom: 34, gap: 22 },
  passo: { flexDirection: 'row', gap: 12 },
  numero: { width: 28, fontFamily: fontes.semi, fontSize: 16, color: cores.destaque, paddingTop: 2 },
  passoCorpo: { flex: 1, gap: 6 },
  exemplo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  fontes: { gap: 8, borderTopWidth: 1, borderTopColor: cores.bordaSuave, paddingTop: 18 },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TOQUE_MINIMO },
});
