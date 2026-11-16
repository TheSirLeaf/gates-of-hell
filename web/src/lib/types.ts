import type { RollResult } from './dice';

export type Role = 'player' | 'master';

export interface Profile {
  id: string;
  display_name: string;
  role: Role;
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
  kind: 'chat' | 'roll';
  body: string;
  rolls: RollResult[] | null;
  secret: boolean;
  created_at: string;
}
