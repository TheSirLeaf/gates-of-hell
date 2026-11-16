import type { RollResult } from './dice';

export type Role = 'player' | 'master' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  role: Role;
  admin_mode: boolean;
}

export interface Ability {
  name: string;
  cost: number;
  description: string;
}

export interface GameClass {
  id: string;
  name: string;
  summary: string;
  bonus_fisico: number;
  bonus_mental: number;
  bonus_espiritual: number;
  vida: number;
  stamina: number;
  skills: string[];
  benefits: string;
  abilities: Ability[];
}

export interface Character {
  id: string;
  owner_id: string;
  name: string;
  race: string;
  class_id: string | null;
  fisico: number;
  mental: number;
  espiritual: number;
  vida: number;
  vida_max: number;
  postura: number;
  postura_max: number;
  stamina: number;
  stamina_max: number;
  armor_kind: string | null;
  armor_material: string | null;
  skills: Record<string, number>;
  chosen_ability: string;
  notes: string;
  avatar_url: string | null;
  updated_at: string;
}

export type ItemKind = 'arma' | 'armadura' | 'item';

export interface InventoryItem {
  id: string;
  character_id: string;
  kind: ItemKind;
  name: string;
  description: string;
  weapon_key: string | null;
  quantity: number;
  equipped: boolean;
}

export interface Monster {
  id: string;
  name: string;
  vida: number;
  vida_max: number;
  postura: number;
  stamina: number;
  resistencia: number;
  fisico: number;
  mental: number;
  espiritual: number;
  attacks: string;
  notes: string;
}

export interface Message {
  id: number;
  author_id: string;
  author_name: string;
  character_id: string | null;
  kind: 'chat' | 'roll' | 'forge';
  body: string;
  rolls: RollResult[] | null;
  payload: ForgePayload | null;
  secret: boolean;
  created_at: string;
}

export type ForgeOutcome = 'Perfeito' | 'Melhor' | 'Bom' | 'Falha' | 'Falha crítica';

export interface ForgePayload {
  weapon: string;
  rarity: string;
  metal: string;
  tests: number;
  perfects: number;
  betters: number;
  goods: number;
  misses: number;
  criticals: number;
  damageBonus: number;
  durability: number;
  divineOk: boolean | null;
  timeline: ForgeOutcome[];
}

export interface ForgeResultRow {
  id: string;
  author_id: string;
  author_name: string;
  character_id: string | null;
  character_name: string;
  weapon: string;
  rarity: string;
  metal: string;
  skill_level: number;
  components: number;
  tests: number;
  perfects: number;
  betters: number;
  goods: number;
  misses: number;
  criticals: number;
  damage_bonus: number;
  durability: number;
  divine_ok: boolean | null;
  timeline: ForgeOutcome[];
  created_at: string;
}

export interface AdminActivity {
  id: number;
  admin_id: string;
  admin_name: string;
  action: 'support_on' | 'support_off' | 'view' | 'create' | 'edit' | 'delete' | 'role';
  target_type: string;
  target_id: string;
  target_label: string;
  created_at: string;
}
