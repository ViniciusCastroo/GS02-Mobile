/**
 * Os 4 cruzamentos cobertos pelo estudo.
 *
 * A lista vem de GET /cruzamentos (ou do mock). Enquanto ela não chega, o app
 * usa a cópia salva no SQLite e, na primeira abertura sem internet, a lista
 * padrão abaixo. Só o primeiro tem dado real; os outros 3 são placeholders
 * até o time de ML informar quais são.
 */
import { useSyncExternalStore } from 'react';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface Cruzamento {
  id: string;
  nome: string;
  placeholder: boolean;
  /** Posição real do cruzamento, ou null enquanto não se sabe qual é. */
  coordenada: Coordenada | null;
  /** Nome curto (ex.: "Nações Unidas × Jaime de Oliveira Souza"). */
  nomeCurto: string;
  /** Via principal, para nomear a rota ("Pela Av. das Nações Unidas"). */
  via: string;
  bairro: string | null;
}

/** Lista padrão (usada até a API responder pela primeira vez). */
export const CRUZAMENTOS_PADRAO: Cruzamento[] = [
  {
    id: 'nu-jaime',
    nome: 'Av. das Nações Unidas × R. Jaime de Oliveira Souza',
    placeholder: false,
    // Fonte: OpenStreetMap (Nominatim) — ponto onde a Av. das Nações Unidas
    // (way 251265978) encontra a R. Jaime de Oliveira Souza (way 941850957),
    // Vila Géa, CEP 04693-130.
    coordenada: { latitude: -23.6814075, longitude: -46.694591 },
    nomeCurto: 'Nações Unidas × Jaime de Oliveira Souza',
    via: 'Av. das Nações Unidas',
    bairro: 'Vila Géa',
  },
  ...[2, 3, 4].map((n) => ({
    id: `cruzamento-${n}`,
    nome: `[cruzamento ${n}]`,
    placeholder: true,
    coordenada: null,
    nomeCurto: `[cruzamento ${n}]`,
    via: '[via]',
    bairro: null,
  })),
];

/** Cruzamento usado na demonstração do replay. */
export const CRUZAMENTO_DEMO = 'nu-jaime';

/* ------------------------- lista atual (estado) ------------------------- */

let lista: Cruzamento[] = CRUZAMENTOS_PADRAO;
const ouvintes = new Set<() => void>();

/** Troca a lista atual (vinda do banco ou da API) e avisa as telas. */
export function definirCruzamentos(nova: Cruzamento[]) {
  if (nova.length === 0) return;
  lista = nova;
  ouvintes.forEach((o) => o());
}

export function listarCruzamentos(): Cruzamento[] {
  return lista;
}

export function idsCruzamentos(): string[] {
  return lista.map((c) => c.id);
}

export function obterCruzamento(id: string | null | undefined): Cruzamento | null {
  if (!id) return null;
  return lista.find((c) => c.id === id) ?? null;
}

export function nomeDoCruzamento(id: string | null | undefined): string | null {
  return obterCruzamento(id)?.nome ?? null;
}

export function coordenadaDoCruzamento(id: string | null | undefined): Coordenada | null {
  return obterCruzamento(id)?.coordenada ?? null;
}

/** Lista atual dentro de um componente (redesenha quando a API atualiza). */
export function useCruzamentos(): Cruzamento[] {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => {
        ouvintes.delete(o);
      };
    },
    () => lista,
    () => lista,
  );
}
