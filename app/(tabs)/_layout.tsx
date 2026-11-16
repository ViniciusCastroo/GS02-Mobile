import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, fontes, TOQUE_MINIMO } from '../../src/theme';

type NomeIcone = keyof typeof Ionicons.glyphMap;

/** Ícone da aba dentro de uma "pílula" que acende quando a aba está ativa (design v2). */
function IconeAba({ nome, ativo }: { nome: NomeIcone; ativo: boolean }) {
  return (
    <View
      style={{
        width: 56,
        height: 30,
        borderRadius: 15,
        backgroundColor: ativo ? cores.destaqueSuave : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={nome} size={20} color={ativo ? cores.destaqueForte : cores.textoTerciario} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.destaqueForte,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarLabelStyle: { fontFamily: fontes.negrito, fontSize: 15, marginTop: 4 },
        tabBarStyle: {
          backgroundColor: cores.superficie,
          borderTopColor: cores.bordaSuave,
          height: 72 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarItemStyle: { minHeight: TOQUE_MINIMO },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lugares',
          tabBarAccessibilityLabel: 'Lugares. Seus lugares salvos e o risco de alagamento de cada um',
          tabBarIcon: ({ focused }) => <IconeAba nome={focused ? 'location' : 'location-outline'} ativo={focused} />,
        }}
      />
      <Tabs.Screen
        name="rotas"
        options={{
          title: 'Rotas',
          tabBarAccessibilityLabel: 'Rotas. Caminhos que desviam de alagamentos',
          tabBarIcon: ({ focused }) => <IconeAba nome={focused ? 'navigate' : 'navigate-outline'} ativo={focused} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarAccessibilityLabel: 'Histórico. Alertas salvos neste celular',
          tabBarIcon: ({ focused }) => <IconeAba nome={focused ? 'time' : 'time-outline'} ativo={focused} />,
        }}
      />
    </Tabs>
  );
}
