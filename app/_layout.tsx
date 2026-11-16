// Importa só os 5 pesos usados (o pacote inteiro tem 18 arquivos de fonte).
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NOME_BANCO } from '../src/config';
import { iniciarBanco } from '../src/db/database';
import { useCarregarCruzamentos } from '../src/hooks/useCarregarCruzamentos';
import { cores, fontes, tipografia } from '../src/theme';

function Carregando() {
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Abrindo o Rota Seca"
    >
      <ActivityIndicator color={cores.destaque} />
    </View>
  );
}

/** Busca os cruzamentos (banco + API) assim que o banco abre. */
function CarregarCruzamentos() {
  useCarregarCruzamentos();
  return null;
}

export default function RootLayout() {
  const [fontesProntas, erroFontes] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!fontesProntas && !erroFontes ? (
        <Carregando />
      ) : (
        <Suspense fallback={<Carregando />}>
          <SQLiteProvider databaseName={NOME_BANCO} onInit={iniciarBanco} useSuspense>
            <CarregarCruzamentos />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: cores.fundo },
                headerShadowVisible: false,
                headerTintColor: cores.destaque,
                headerTitleAlign: 'center',
                headerTitleStyle: { fontFamily: fontes.semi, fontSize: tipografia.medio, color: cores.texto },
                headerBackTitle: 'Voltar',
                headerBackTitleStyle: { fontFamily: fontes.regular, fontSize: tipografia.medio },
                contentStyle: { backgroundColor: cores.fundo },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Início' }} />
              <Stack.Screen name="lugar/[id]" options={{ title: 'Lugar' }} />
              <Stack.Screen name="alerta/[id]" options={{ headerShown: false, title: 'Detalhe do alerta' }} />
              <Stack.Screen name="como-funciona" options={{ title: 'Como funciona' }} />
            </Stack>
          </SQLiteProvider>
        </Suspense>
      )}
    </SafeAreaProvider>
  );
}
