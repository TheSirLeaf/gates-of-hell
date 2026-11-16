import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

type Row = { id: string | number };

interface Options<T> {
  /** Filtro de coluna aplicado no select inicial e na assinatura (ex.: character_id=eq.123). */
  filter?: { column: string; value: string };
  /** Ordenação aplicada localmente depois de cada mudança. */
  sort?: (a: T, b: T) => number;
  /** Colunas do select. */
  columns?: string;
  /** Desliga a leitura (ex.: quando falta um id). */
  enabled?: boolean;
  /** Carrega só as N linhas mais recentes (maior valor da coluna) no select inicial. */
  latest?: { column: string; count: number };
}

/**
 * Lê uma tabela e a mantém sincronizada por Supabase Realtime (postgres_changes).
 * O RLS vale também no Realtime: cada usuário só recebe o que pode ler.
 */
export function useTable<T extends Row>(table: string, opts: Options<T> = {}) {
  const { filter, sort, columns = '*', enabled = true } = opts;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  const filterColumn = filter?.column;
  const filterValue = filter?.value;
  const latestColumn = opts.latest?.column;
  const latestCount = opts.latest?.count ?? 200;

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    const apply = (list: T[]) => (sortRef.current ? [...list].sort(sortRef.current) : list);

    let query = supabase.from(table).select(columns);
    if (filterColumn && filterValue) query = query.eq(filterColumn, filterValue);
    if (latestColumn) query = query.order(latestColumn, { ascending: false }).limit(latestCount);
    query.then(({ data, error: err }) => {
      if (!active) return;
      if (err) setError(err.message);
      else {
        setError(null);
        setRows(apply((data ?? []) as unknown as T[]));
      }
      setLoading(false);
    });

    const channel = supabase
      .channel(`rt:${table}:${filterColumn ?? ''}:${filterValue ?? ''}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filterColumn && filterValue ? { filter: `${filterColumn}=eq.${filterValue}` } : {}),
        },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === 'DELETE') {
              const id = (payload.old as Row).id;
              return prev.filter((r) => r.id !== id);
            }
            const row = payload.new as T;
            const exists = prev.some((r) => r.id === row.id);
            return apply(exists ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row]);
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [table, columns, filterColumn, filterValue, enabled, latestColumn, latestCount]);

  return { rows, loading, error, setRows };
}
