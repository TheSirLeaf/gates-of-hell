import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

/**
 * Edição otimista com salvamento automático (debounce) de uma linha.
 * Mudanças vindas de outros clientes (Realtime) só sobrescrevem o rascunho
 * quando não há alterações locais pendentes.
 */
export function useDraft<T extends { id: string }>(table: string, source: T | undefined, delay = 600) {
  const [draft, setDraft] = useState<T | undefined>(source);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Partial<T>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(source?.id);
  idRef.current = source?.id;

  useEffect(() => {
    if (Object.keys(pending.current).length === 0) setDraft(source);
  }, [source]);

  const flush = useCallback(async () => {
    const id = idRef.current;
    const changes = pending.current;
    if (!id || Object.keys(changes).length === 0) return;
    pending.current = {};
    setStatus('saving');
    const { error: err } = await supabase.from(table).update(changes as Record<string, unknown>).eq('id', id);
    if (err) {
      setStatus('error');
      setError(err.message);
    } else {
      setStatus('saved');
      setError(null);
    }
  }, [table]);

  const patch = useCallback(
    (changes: Partial<T>) => {
      setDraft((d) => (d ? { ...d, ...changes } : d));
      pending.current = { ...pending.current, ...changes };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [flush, delay],
  );

  // Salva o que sobrou ao sair da tela.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return { draft, patch, status, error, flush };
}
