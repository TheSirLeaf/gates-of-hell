import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Character, GameClass } from './types';
import { useTable } from './useTable';

interface GameData {
  characters: Character[];
  classes: GameClass[];
  loading: boolean;
  error: string | null;
  classById: (id: string | null | undefined) => GameClass | undefined;
}

const GameContext = createContext<GameData | null>(null);

/** Dados compartilhados por todas as telas (fichas visíveis ao usuário + classes), sempre ao vivo. */
export function GameProvider({ children }: { children: ReactNode }) {
  const chars = useTable<Character>('characters', {
    sort: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  });
  const cls = useTable<GameClass>('classes', {
    sort: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  });

  const value = useMemo<GameData>(
    () => ({
      characters: chars.rows,
      classes: cls.rows,
      loading: chars.loading || cls.loading,
      error: chars.error ?? cls.error,
      classById: (id) => (id ? cls.rows.find((c) => c.id === id) : undefined),
    }),
    [chars.rows, cls.rows, chars.loading, cls.loading, chars.error, cls.error],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameData {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame fora do GameProvider');
  return ctx;
}
