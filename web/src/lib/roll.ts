import { rollCommand, DiceRollError, type RollResult } from './dice';
import { supabase } from './supabase';
import type { Profile } from './types';

export interface RollContext {
  profile: Profile;
  characterId?: string | null;
  secret?: boolean;
}

export interface PostedRoll {
  /** Mensagem de erro em português, ou null se deu certo. */
  error: string | null;
  results: RollResult[];
}

/**
 * Rola no navegador e publica o resultado no chat (tabela messages).
 * `label` (opcional) é anexado ao comando quando ele ainda não tem rótulo.
 */
export async function postRoll(input: string, ctx: RollContext, label?: string): Promise<PostedRoll> {
  const text = label && !input.includes('[') ? `${input} ${label}` : input;
  let results: RollResult[];
  try {
    results = rollCommand(text);
  } catch (e) {
    return { error: e instanceof DiceRollError ? e.message : 'Não consegui rolar isso.', results: [] };
  }

  const { error } = await supabase.from('messages').insert({
    author_id: ctx.profile.id,
    author_name: ctx.profile.display_name,
    character_id: ctx.characterId ?? null,
    kind: 'roll',
    body: text,
    rolls: results,
    secret: Boolean(ctx.secret),
  });
  return { error: error ? 'Falha ao publicar a rolagem: ' + error.message : null, results };
}

export async function postChat(body: string, profile: Profile, characterId?: string | null): Promise<string | null> {
  const text = body.trim();
  if (!text) return null;
  const { error } = await supabase.from('messages').insert({
    author_id: profile.id,
    author_name: profile.display_name,
    character_id: characterId ?? null,
    kind: 'chat',
    body: text,
  });
  return error ? 'Falha ao enviar: ' + error.message : null;
}
