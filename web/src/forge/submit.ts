import { supabase } from '../lib/supabase';
import type { Character, Profile } from '../lib/types';
import { itemName, type ForgeConfig, type ForgeSummary } from './logic';

/**
 * Entrega o resultado da fabricação ao mestre:
 *  1. grava em forge_results (histórico — só o autor e o mestre leem);
 *  2. publica um cartão no chat (kind = 'forge'), que chega ao mestre em tempo real.
 * Retorna uma mensagem de erro ou null.
 */
export async function submitForge(
  profile: Profile,
  character: Character | null,
  config: ForgeConfig,
  s: ForgeSummary,
): Promise<string | null> {
  const { error: e1 } = await supabase.from('forge_results').insert({
    author_id: profile.id,
    author_name: profile.display_name,
    character_id: character?.id ?? null,
    character_name: character?.name ?? '',
    weapon: s.weapon,
    rarity: s.rarity,
    metal: s.metal,
    skill_level: config.smithLevel,
    components: config.components,
    tests: s.tests,
    perfects: s.perfects,
    betters: s.betters,
    goods: s.goods,
    misses: s.misses,
    criticals: s.criticals,
    damage_bonus: s.damageBonus,
    durability: s.durability,
    divine_ok: s.divineOk,
    timeline: s.timeline,
  });
  if (e1) return 'Não consegui gravar o resultado: ' + e1.message;

  const { error: e2 } = await supabase.from('messages').insert({
    author_id: profile.id,
    author_name: profile.display_name,
    character_id: character?.id ?? null,
    kind: 'forge',
    body: `Forjou ${itemName(s)}`,
    payload: s,
  });
  return e2 ? 'Resultado salvo, mas não consegui avisar no chat: ' + e2.message : null;
}

export async function saveToInventory(character: Character, s: ForgeSummary): Promise<string | null> {
  const { error } = await supabase.from('inventory_items').insert({
    character_id: character.id,
    kind: 'arma',
    name: itemName(s).replace(/^./, (c) => c.toUpperCase()),
    description:
      `Forjada: dano +${s.damageBonus} · durabilidade ${s.durability}` +
      (s.divineOk === false ? ' · tentativa divina falhou' : '') +
      ` (${s.perfects} perfeitos, ${s.betters} melhores, ${s.criticals} falhas críticas)`,
    quantity: 1,
  });
  return error ? error.message : null;
}
