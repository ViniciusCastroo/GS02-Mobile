/**
 * Configuração do app.
 *
 * USE_MOCK = true  -> lê o mock local, que segue o mesmo contrato da API.
 * USE_MOCK = false -> consulta a API em API_URL (GET /cruzamentos e /risco).
 */
export const API_URL = 'http://192.168.15.3:8080'; // backend de SOA rodando no PC (rede local)

export const USE_MOCK = false;

/**
 * Demonstração com o replay de 16/01/2025: mostra o selo e o seletor 18:00/18:48
 * e envia em=2025-01-16T18:00:00-03:00 (ou 18:48) em cada consulta de risco.
 * Funciona com o mock e com a API. false = dados de agora.
 */
export const MODO_DEMO = true;

/**
 * Junta as consultas de risco feitas ao mesmo tempo em uma só chamada
 * GET /risco?locais=a,b (a tela de lugares pede vários cruzamentos de uma vez).
 */
export const USAR_LOTE = true;

/** A previsão é horária; o app consulta a API a cada 15 minutos. */
export const INTERVALO_ATUALIZACAO_MS = 15 * 60 * 1000;

/** Tempo máximo de espera de uma resposta da API antes de usar o cache. */
export const TEMPO_LIMITE_REQUISICAO_MS = 10 * 1000;

/** Nome do arquivo do banco SQLite local. */
export const NOME_BANCO = 'rotaseca.db';

/**
 * Serviços abertos, sem chave, usados para as rotas reais:
 * - Nominatim (OpenStreetMap): transforma endereço em posição.
 * - OSRM (routing.openstreetmap.de): calcula rota, tempo e distância.
 * Ambos pedem uso moderado (o app guarda as posições dos lugares no banco).
 */
export const GEOCODER_URL = 'https://nominatim.openstreetmap.org/search';
export const ROTAS_URL = 'https://routing.openstreetmap.de';
/** Identificação do app exigida pela política de uso do Nominatim. */
export const IDENTIFICACAO_APP = 'RotaSeca/1.0 (FIAP Global Solution, app educacional)';

/**
 * Mapbox Directions (tempo COM trânsito no carro). Opcional:
 * coloque a chave pública (pk.…) em .env.local -> EXPO_PUBLIC_MAPBOX_TOKEN=pk....
 * Sem chave, ou se o Mapbox falhar, o app usa o OSRM (tempo sem trânsito).
 */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
export const MAPBOX_URL = 'https://api.mapbox.com/directions/v5';
