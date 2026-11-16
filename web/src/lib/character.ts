import type { AttrKey } from '../rules';
import { resistance, skillBudget } from '../rules';
import type { Character, GameClass } from './types';

export function classBonus(cls: GameClass | undefined | null, attr: AttrKey): number {
  if (!cls) return 0;
  return attr === 'fisico' ? cls.bonus_fisico : attr === 'mental' ? cls.bonus_mental : cls.bonus_espiritual;
}

/** Atributo efetivo = valor base da ficha + bônus da classe. */
export function attrTotal(c: Character, cls: GameClass | undefined | null, attr: AttrKey): number {
  return c[attr] + classBonus(cls, attr);
}

export function skillsWithPoints(c: Character): number {
  return Object.values(c.skills ?? {}).filter((v) => v > 0).length;
}

export function skillLimit(c: Character, cls: GameClass | undefined | null): number {
  return skillBudget(attrTotal(c, cls, 'mental'), Boolean(cls));
}

export const characterResistance = (c: Character): number => resistance(c.armor_kind, c.armor_material);
