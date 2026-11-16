import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { cores, sombra } from '../theme';
import type { PontoMapa, PropsMapa } from './Mapa.tipos';
import { MapaIlustrado } from './MapaIlustrado';

/** Zoom padrão: ~1 km de altura, o suficiente para ver as ruas em volta do cruzamento. */
const DELTA = 0.009;

function Marcador({ p }: { p: PontoMapa }) {
  return (
    <Marker coordinate={p.coordenada} title={p.titulo} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={[styles.marcador, { backgroundColor: p.fundo }]}>
        <Ionicons name={p.icone} size={20} color={p.cor} />
      </View>
    </Marker>
  );
}

/**
 * Mapa real (Apple Maps no iOS, Google Maps no Android), com o cruzamento,
 * as rotas e os marcadores. Funciona no Expo Go. Sem nada para mostrar, cai na ilustração.
 */
export function Mapa(props: PropsMapa) {
  const { altura, descricao, ponto, marcadores = [], linhas = [], margemTopo = 0, deslocamento = 0, children } = props;
  const mapa = useRef<MapView>(null);

  const centro = ponto?.coordenada ?? marcadores[0]?.coordenada ?? linhas[0]?.coordenadas[0] ?? null;
  const todos = [...linhas.flatMap((l) => l.coordenadas), ...marcadores.map((m) => m.coordenada)];
  const chaveEnquadrar = `${linhas.map((l) => `${l.id}:${l.coordenadas.length}`).join('|')}|${marcadores
    .map((m) => `${m.coordenada.latitude},${m.coordenada.longitude}`)
    .join('|')}|${ponto ? `${ponto.coordenada.latitude},${ponto.coordenada.longitude}` : ''}`;

  useEffect(() => {
    if (!mapa.current) return;
    if (todos.length > 1) {
      mapa.current.fitToCoordinates(todos, {
        edgePadding: { top: margemTopo + 40, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    } else if (centro) {
      mapa.current.animateToRegion(
        { latitude: centro.latitude + DELTA * deslocamento, longitude: centro.longitude, latitudeDelta: DELTA, longitudeDelta: DELTA },
        300,
      );
    }
    // Reenquadra só quando o conteúdo muda de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveEnquadrar]);

  if (!centro) return <MapaIlustrado {...props} />;

  return (
    <View style={[styles.area, { height: altura }]}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: centro.latitude + DELTA * deslocamento,
          longitude: centro.longitude,
          latitudeDelta: DELTA,
          longitudeDelta: DELTA,
        }}
        accessible
        accessibilityLabel={descricao}
        accessibilityHint="Mapa do trajeto e do cruzamento monitorado"
        toolbarEnabled={false}
        showsPointsOfInterests={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {[...linhas]
          .sort((a, b) => Number(!!a.destaque) - Number(!!b.destaque))
          .map((l) => (
            <Polyline
              key={l.id}
              coordinates={l.coordenadas}
              strokeColor={l.cor}
              strokeWidth={l.largura}
              lineDashPattern={l.tracejada ? [8, 6] : undefined}
              zIndex={l.destaque ? 2 : 1}
            />
          ))}
        {marcadores.map((m, i) => (
          <Marcador key={`m-${i}`} p={m} />
        ))}
        {ponto ? <Marcador p={ponto} /> : null}
      </MapView>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: cores.mapa, overflow: 'hidden', position: 'relative' },
  marcador: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.leve,
  },
});
