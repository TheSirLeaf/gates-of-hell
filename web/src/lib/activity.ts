import { useEffect } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';
import type { AdminActivity } from './types';

const OBJECT: Record<string, (label: string) => string> = {
  character: (l) => `a ficha de “${l}”`,
  inventory: (l) => `o ${l.charAt(0).toLowerCase()}${l.slice(1)}`,
  class: (l) => `a classe “${l}”`,
  monster: (l) => `o monstro “${l}”`,
  bestiary: () => 'o bestiário',
  chat: () => 'o chat (mensagens secretas / histórico)',
  forge: () => 'o histórico da forja',
};

const VERB: Record<string, string> = {
  view: 'abriu',
  edit: 'alterou',
  create: 'criou',
  delete: 'apagou',
};

/** Frase curta e tranquila, escrita para o mestre ler sem susto. */
export function describeActivity(a: AdminActivity): string {
  switch (a.action) {
    case 'support_on':
      return 'ligou o modo suporte';
    case 'support_off':
      return 'desligou o modo suporte';
    case 'role':
      return `mudou um papel: ${a.target_label}`;
    case 'account':
      return `gerenciou uma conta: ${a.target_label}`;
    default: {
      const obj = OBJECT[a.target_type]?.(a.target_label) ?? a.target_label;
      return `${VERB[a.action] ?? a.action} ${obj}`;
    }
  }
}

/** O admin, em modo suporte, registra no log do mestre o que ele abriu (leituras não têm trigger no banco). */
export function useAuditView(type: string, id: string, label: string, enabled = true): void {
  const { adminMode } = useAuth();
  useEffect(() => {
    if (!adminMode || !enabled || !id) return;
    void supabase.rpc('admin_log_view', { p_type: type, p_id: id, p_label: label });
  }, [adminMode, enabled, type, id, label]);
}
