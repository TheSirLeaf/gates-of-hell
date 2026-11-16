import { PREVIEW } from '../dev/preview';
import { supabase } from './supabase';
import type { Role } from './types';

export interface AccountRow {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  characters: number;
}

type Rpc = 'admin_rename_user' | 'admin_set_password' | 'admin_set_banned' | 'admin_delete_user' | 'admin_set_role';

/** Chama uma função administrativa do banco. Retorna a mensagem de erro (ou null). */
export async function adminCall(fn: Rpc, args: Record<string, unknown>): Promise<string | null> {
  const { error } = await supabase.rpc(fn, args);
  return error ? error.message : null;
}

const MOCK_ACCOUNTS: AccountRow[] = [
  { id: 'me', email: 'patrick@exemplo.com', display_name: 'Patrick', role: 'admin', created_at: '2026-10-01T10:00:00Z', last_sign_in_at: new Date().toISOString(), banned: false, characters: 1 },
  { id: 'a2', email: 'ravn@exemplo.com', display_name: 'Mestre Ravn', role: 'master', created_at: '2026-10-02T10:00:00Z', last_sign_in_at: new Date(Date.now() - 3600e3 * 5).toISOString(), banned: false, characters: 0 },
  { id: 'a3', email: 'lia@exemplo.com', display_name: 'Lia', role: 'player', created_at: '2026-10-05T10:00:00Z', last_sign_in_at: new Date(Date.now() - 86400e3 * 2).toISOString(), banned: false, characters: 2 },
  { id: 'a4', email: 'tom@exemplo.com', display_name: 'Tom', role: 'player', created_at: '2026-10-09T10:00:00Z', last_sign_in_at: null, banned: true, characters: 1 },
];

export async function listAccounts(): Promise<{ rows: AccountRow[]; error: string | null }> {
  if (PREVIEW) return { rows: MOCK_ACCOUNTS, error: null };
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as AccountRow[], error: null };
}

/** Gera uma senha temporária legível (sem caracteres ambíguos). */
export function tempPassword(length = 10): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
