/**
 * Banco local (expo-sqlite): lugares, alertas e cache_risco.
 * Tudo aqui funciona sem internet.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { serializarRotina } from '../domain/lugar';
import { agoraIsoLocal, deveRegistrarAlerta, resolverStatus } from '../domain/risco';
import type { CruzamentoApi } from '../domain/contrato';
import type { AlertaComLugar, Lugar, LugarEntrada, RiscoResposta, StatusRisco } from '../types';

const VERSAO_BANCO = 4;

/**
 * Cria/atualiza as tabelas (migrações por PRAGMA user_version) e faz o seed.
 * Usado no onInit do SQLiteProvider.
 * - v1: tabelas lugares, alertas e cache_risco
 * - v2: etiqueta_personalizada em lugares; valida_ate, estimativa e confirmado_em em alertas
 * - v3: latitude e longitude em lugares (posição do endereço, para as rotas)
 * - v4: tabela cruzamentos (cópia de GET /cruzamentos, para abrir sem internet)
 */
export async function iniciarBanco(db: SQLiteDatabase): Promise<void> {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;
  if (versao >= VERSAO_BANCO) return;

  if (versao < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS lugares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        etiqueta TEXT NOT NULL,
        endereco TEXT NOT NULL,
        local_id TEXT,
        dias_horarios TEXT NOT NULL DEFAULT '',
        criado_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS alertas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT NOT NULL,
        lugar_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        previsao_hora TEXT NOT NULL,
        confirmado_cge INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL,
        UNIQUE (lugar_id, local_id, previsao_hora, confirmado_cge)
      );
      CREATE TABLE IF NOT EXISTS cache_risco (
        local_id TEXT PRIMARY KEY NOT NULL,
        json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );
    `);
    versao = 1;
  }

  if (versao < 2) {
    await db.execAsync(`
      ALTER TABLE lugares ADD COLUMN etiqueta_personalizada TEXT;
      ALTER TABLE alertas ADD COLUMN valida_ate TEXT;
      ALTER TABLE alertas ADD COLUMN estimativa REAL;
      ALTER TABLE alertas ADD COLUMN confirmado_em TEXT;
    `);
    versao = 2;
  }

  if (versao < 3) {
    await db.execAsync(`
      ALTER TABLE lugares ADD COLUMN latitude REAL;
      ALTER TABLE lugares ADD COLUMN longitude REAL;
    `);
    // Quem já tinha o seed antigo (endereços placeholder) recebe os exemplos novos.
    for (const ex of EXEMPLOS) {
      if (!ex.enderecoAntigo) continue;
      await db.runAsync(
        'UPDATE lugares SET endereco = ?, latitude = ?, longitude = ? WHERE endereco = ?',
        ex.lugar.endereco,
        ex.lugar.latitude ?? null,
        ex.lugar.longitude ?? null,
        ex.enderecoAntigo,
      );
    }
    versao = 3;
  }

  if (versao < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cruzamentos (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        nome_curto TEXT NOT NULL,
        via TEXT,
        bairro TEXT,
        latitude REAL,
        longitude REAL,
        placeholder INTEGER NOT NULL DEFAULT 0,
        ordem INTEGER NOT NULL DEFAULT 0,
        atualizado_em TEXT NOT NULL
      );
    `);
    versao = 4;
  }

  await semearLugares(db);
  await db.execAsync(`PRAGMA user_version = ${VERSAO_BANCO}`);
}

/**
 * Lugares de exemplo. Casa e Trabalho usam pontos públicos de São Paulo, de
 * lados opostos do cruzamento Av. das Nações Unidas × R. Jaime de Oliveira
 * Souza, para que a rota Casa -> Trabalho passe por ele. Posições do
 * OpenStreetMap (Nominatim). Casa da vó segue sem endereço real.
 */
const EXEMPLOS: { lugar: LugarEntrada; enderecoAntigo?: string }[] = [
  {
    enderecoAntigo: 'Av. das Nações Unidas, [número] · [bairro]',
    lugar: {
      nome: 'Trabalho',
      etiqueta: 'Trabalho',
      etiqueta_personalizada: null,
      endereco: 'Shopping SP Market – Av. das Nações Unidas, Vila Géa (exemplo)',
      local_id: 'nu-jaime',
      dias_horarios: serializarRotina({ dias: [1, 2, 3, 4, 5], chegada: '09:00', saida: '18:00' }),
      latitude: -23.678487,
      longitude: -46.6991686,
    },
  },
  {
    enderecoAntigo: '[endereço da casa]',
    lugar: {
      nome: 'Casa',
      etiqueta: 'Casa',
      etiqueta_personalizada: null,
      endereco: 'Estação Autódromo – R. Plínio Schmidt, Cidade Dutra (exemplo)',
      local_id: null,
      dias_horarios: serializarRotina({ dias: [0, 1, 2, 3, 4, 5, 6], chegada: '', saida: '' }),
      latitude: -23.7056096,
      longitude: -46.6881681,
    },
  },
  {
    lugar: {
      nome: 'Casa da vó',
      etiqueta: 'Casa da vó',
      etiqueta_personalizada: null,
      endereco: '[endereço da casa da vó]',
      local_id: null,
      dias_horarios: serializarRotina({ dias: [0], chegada: '', saida: '' }),
    },
  },
];

/** Seed com os 3 lugares de exemplo (só se a tabela estiver vazia). */
async function semearLugares(db: SQLiteDatabase): Promise<void> {
  const total = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM lugares');
  if ((total?.n ?? 0) > 0) return;
  for (const ex of EXEMPLOS) await criarLugar(db, ex.lugar);
}

/* ---------------------------- lugares (CRUD) ---------------------------- */

export async function listarLugares(db: SQLiteDatabase): Promise<Lugar[]> {
  return db.getAllAsync<Lugar>('SELECT * FROM lugares ORDER BY id ASC');
}

export async function obterLugar(db: SQLiteDatabase, id: number): Promise<Lugar | null> {
  return db.getFirstAsync<Lugar>('SELECT * FROM lugares WHERE id = ?', id);
}

const personalizada = (l: LugarEntrada) =>
  l.etiqueta === 'Personalizada' ? l.etiqueta_personalizada?.trim() || null : null;

export async function criarLugar(db: SQLiteDatabase, l: LugarEntrada): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO lugares (nome, etiqueta, etiqueta_personalizada, endereco, local_id, dias_horarios, latitude, longitude, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    l.nome.trim(),
    l.etiqueta,
    personalizada(l),
    l.endereco.trim(),
    l.local_id,
    l.dias_horarios,
    l.latitude ?? null,
    l.longitude ?? null,
    agoraIsoLocal(),
  );
  return r.lastInsertRowId;
}

export async function atualizarLugar(db: SQLiteDatabase, id: number, l: LugarEntrada): Promise<void> {
  await db.runAsync(
    `UPDATE lugares SET nome = ?, etiqueta = ?, etiqueta_personalizada = ?, endereco = ?, local_id = ?, dias_horarios = ?,
       latitude = ?, longitude = ?
     WHERE id = ?`,
    l.nome.trim(),
    l.etiqueta,
    personalizada(l),
    l.endereco.trim(),
    l.local_id,
    l.dias_horarios,
    l.latitude ?? null,
    l.longitude ?? null,
    id,
  );
}

/** Guarda a posição encontrada para o endereço do lugar. */
export async function salvarPosicaoLugar(
  db: SQLiteDatabase,
  id: number,
  c: { latitude: number; longitude: number },
): Promise<void> {
  await db.runAsync('UPDATE lugares SET latitude = ?, longitude = ? WHERE id = ?', c.latitude, c.longitude, id);
}

/** Exclui o lugar. Os alertas antigos continuam no histórico. */
export async function excluirLugar(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM lugares WHERE id = ?', id);
}

/* -------------------------------- alertas ------------------------------- */

interface AlertaLinha extends Omit<AlertaComLugar, 'confirmado_cge' | 'status'> {
  status: string;
  confirmado_cge: number;
}

const paraAlerta = (l: AlertaLinha): AlertaComLugar => ({
  ...l,
  status: l.status as StatusRisco,
  confirmado_cge: l.confirmado_cge === 1,
});

const SELECT_ALERTA = `
  SELECT a.*, l.nome AS lugar_nome,
         CASE WHEN l.etiqueta = 'Personalizada' AND l.etiqueta_personalizada IS NOT NULL
              THEN l.etiqueta_personalizada ELSE l.etiqueta END AS lugar_etiqueta
  FROM alertas a LEFT JOIN lugares l ON l.id = a.lugar_id`;

/** Mais recentes primeiro (pelo horário do evento). */
export async function listarAlertas(db: SQLiteDatabase): Promise<AlertaComLugar[]> {
  const linhas = await db.getAllAsync<AlertaLinha>(
    `${SELECT_ALERTA} ORDER BY COALESCE(a.confirmado_em, a.previsao_hora) DESC, a.id DESC`,
  );
  return linhas.map(paraAlerta);
}

export async function obterAlerta(db: SQLiteDatabase, id: number): Promise<AlertaComLugar | null> {
  const l = await db.getFirstAsync<AlertaLinha>(`${SELECT_ALERTA} WHERE a.id = ?`, id);
  return l ? paraAlerta(l) : null;
}

/**
 * Grava um alerta para cada lugar salvo ligado ao cruzamento quando ele passa
 * para "elevado" ou é confirmado pelo CGE. O índice UNIQUE impede duplicar o
 * mesmo horário de previsão (INSERT OR IGNORE).
 */
export async function registrarAlertas(db: SQLiteDatabase, resposta: RiscoResposta): Promise<number> {
  if (!deveRegistrarAlerta(resposta)) return 0;
  const lugares = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM lugares WHERE local_id = ?',
    resposta.local_id,
  );
  let novos = 0;
  for (const lugar of lugares) {
    const r = await db.runAsync(
      `INSERT OR IGNORE INTO alertas
         (local_id, lugar_id, status, previsao_hora, confirmado_cge, criado_em, valida_ate, estimativa, confirmado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      resposta.local_id,
      lugar.id,
      resolverStatus(resposta),
      resposta.previsao_hora,
      resposta.confirmado_cge ? 1 : 0,
      agoraIsoLocal(),
      resposta.valida_ate,
      resposta.estimativa,
      resposta.confirmado_em,
    );
    novos += r.changes;
  }
  return novos;
}

/* ------------------------------ cache_risco ----------------------------- */

export interface CacheRisco {
  resposta: RiscoResposta;
  atualizado_em: string;
}

export async function salvarCache(db: SQLiteDatabase, resposta: RiscoResposta): Promise<string> {
  const agora = agoraIsoLocal();
  await db.runAsync(
    'INSERT OR REPLACE INTO cache_risco (local_id, json, atualizado_em) VALUES (?, ?, ?)',
    resposta.local_id,
    JSON.stringify(resposta),
    agora,
  );
  return agora;
}

export async function lerCache(db: SQLiteDatabase, localId: string): Promise<CacheRisco | null> {
  const l = await db.getFirstAsync<{ json: string; atualizado_em: string }>(
    'SELECT json, atualizado_em FROM cache_risco WHERE local_id = ?',
    localId,
  );
  if (!l) return null;
  try {
    return { resposta: JSON.parse(l.json) as RiscoResposta, atualizado_em: l.atualizado_em };
  } catch {
    return null;
  }
}

/* ------------------------------ cruzamentos ----------------------------- */

/** Troca a cópia local pela lista recebida de GET /cruzamentos. */
export async function salvarCruzamentos(db: SQLiteDatabase, lista: CruzamentoApi[]): Promise<void> {
  const agora = agoraIsoLocal();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cruzamentos');
    let ordem = 0;
    for (const c of lista) {
      await db.runAsync(
        `INSERT INTO cruzamentos (id, nome, nome_curto, via, bairro, latitude, longitude, placeholder, ordem, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id,
        c.nome,
        c.nome_curto,
        c.via,
        c.bairro,
        c.latitude,
        c.longitude,
        c.placeholder ? 1 : 0,
        ordem++,
        agora,
      );
    }
  });
}

/** Cópia local dos cruzamentos (vazia na primeira abertura). */
export async function lerCruzamentos(db: SQLiteDatabase): Promise<CruzamentoApi[]> {
  const linhas = await db.getAllAsync<Omit<CruzamentoApi, 'placeholder'> & { placeholder: number }>(
    'SELECT id, nome, nome_curto, via, bairro, latitude, longitude, placeholder FROM cruzamentos ORDER BY ordem',
  );
  return linhas.map((l) => ({ ...l, placeholder: l.placeholder === 1 }));
}
