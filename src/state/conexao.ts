/**
 * Situação da conexão vista pelo app: muda quando uma consulta à API
 * dá certo ou falha. Usada para mostrar o aviso "Você está sem internet".
 */
import { useSyncExternalStore } from 'react';

let semConexao = false;
const ouvintes = new Set<() => void>();

export function informarConexao(ok: boolean) {
  if (semConexao === !ok) return;
  semConexao = !ok;
  ouvintes.forEach((o) => o());
}

export function useSemConexao(): boolean {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => {
        ouvintes.delete(o);
      };
    },
    () => semConexao,
    () => semConexao,
  );
}
