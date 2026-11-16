import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { buscarCruzamentos } from '../api/client';
import { INTERVALO_ATUALIZACAO_MS } from '../config';
import { definirCruzamentos } from '../data/cruzamentos';
import { lerCruzamentos, salvarCruzamentos } from '../db/database';
import { paraCruzamento } from '../domain/contrato';

/**
 * Carrega os cruzamentos ao abrir o app:
 * 1. a cópia salva no SQLite (funciona sem internet);
 * 2. GET /cruzamentos, que atualiza a cópia e as telas.
 * Se a API falhar, tenta de novo a cada 15 minutos. Sem nada salvo, vale a lista padrão.
 */
export function useCarregarCruzamentos() {
  const db = useSQLiteContext();
  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    lerCruzamentos(db)
      .then((salvos) => {
        if (ativo && salvos.length > 0) definirCruzamentos(salvos.map(paraCruzamento));
      })
      .catch(() => undefined);

    const atualizar = async () => {
      try {
        const lista = await buscarCruzamentos();
        if (!ativo) return;
        definirCruzamentos(lista.map(paraCruzamento));
        await salvarCruzamentos(db, lista);
      } catch {
        if (ativo) timer = setTimeout(atualizar, INTERVALO_ATUALIZACAO_MS);
      }
    };
    atualizar();

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
    };
  }, [db]);
}
