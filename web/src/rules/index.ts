/**
 * Regras do sistema (fonte: remake-resources/ FICHA.md, REGRAS.md e as tabelas de equipamento).
 * Tudo que é regra fixa mora aqui; o que o mestre edita (classes, monstros, itens) mora no banco.
 */

// ---------- Atributos e perícias -------------------------------------

export type AttrKey = 'fisico' | 'mental' | 'espiritual';

export const ATTRS: { key: AttrKey; name: string; hint: string }[] = [
  { key: 'fisico', name: 'Físico', hint: 'Tudo que está ligado ao corpo' },
  { key: 'mental', name: 'Mental', hint: 'Tudo que está ligado ao pensamento' },
  { key: 'espiritual', name: 'Espiritual', hint: 'Tudo que está ligado ao espírito' },
];

export const attrName = (k: AttrKey): string => ATTRS.find((a) => a.key === k)!.name;

export interface SkillDef {
  key: string;
  name: string;
  attr: AttrKey;
}

export const SKILLS: SkillDef[] = [
  { key: 'luta', name: 'Luta', attr: 'fisico' },
  { key: 'iniciativa', name: 'Iniciativa', attr: 'fisico' },
  { key: 'esquiva', name: 'Esquiva', attr: 'fisico' },
  { key: 'fortitude', name: 'Fortitude', attr: 'fisico' },
  { key: 'atletismo', name: 'Atletismo', attr: 'fisico' },

  { key: 'percepcao', name: 'Percepção', attr: 'mental' },
  { key: 'historia', name: 'História', attr: 'mental' },
  { key: 'linguagem', name: 'Linguagem', attr: 'mental' },
  { key: 'pontaria', name: 'Pontaria', attr: 'mental' },
  { key: 'alquimia', name: 'Alquimia', attr: 'mental' },

  { key: 'vontade', name: 'Vontade', attr: 'espiritual' },
  { key: 'furtividade', name: 'Furtividade', attr: 'espiritual' },
  { key: 'instinto', name: 'Instinto', attr: 'espiritual' },
  { key: 'intimidacao', name: 'Intimidação', attr: 'espiritual' },
  { key: 'enganacao', name: 'Enganação', attr: 'espiritual' },
];

export const skillName = (key: string): string => SKILLS.find((s) => s.key === key)?.name ?? key;

/** Teste de atributo = Nd20kh1, N = valor do atributo (mínimo 1d20). */
export const testDice = (attrValue: number): number => Math.max(1, attrValue);
export const testExpression = (attrValue: number): string => `${testDice(attrValue)}d20kh1`;

/** Perícia soma o valor dela ao teste do atributo do grupo. */
export function skillExpression(attrValue: number, skillValue: number): string {
  const base = testExpression(attrValue);
  return skillValue > 0 ? `${base}+${skillValue}` : base;
}

/** Slots de perícia: um por ponto em Mental + 3 da classe (se houver classe). */
export const skillBudget = (mentalTotal: number, hasClass: boolean): number =>
  Math.max(0, mentalTotal) + (hasClass ? 3 : 0);

// ---------- Armaduras ------------------------------------------------

export type Material = 'Couro' | 'Ferro' | 'Estige' | 'Ouro';

export interface ArmorKind {
  key: string;
  name: string;
  bonus: number; // o "+N" do nome da armadura
  rank: string; // patente mínima
  /** Defesa por material permitido. */
  defense: Partial<Record<Material, number>>;
}

export const ARMORS: ArmorKind[] = [
  { key: 'simples', name: 'Simples', bonus: 1, rank: 'Soldado', defense: { Couro: 2, Ferro: 3 } },
  { key: 'composta', name: 'Composta', bonus: 2, rank: 'Capitão de esquadrão', defense: { Couro: 3, Ferro: 4, Estige: 6 } },
  { key: 'media', name: 'Média', bonus: 3, rank: 'Capitão de Brigada', defense: { Couro: 4, Ferro: 5, Ouro: 6 } },
  { key: 'completa', name: 'Completa', bonus: 4, rank: 'General', defense: { Estige: 8, Ferro: 6, Ouro: 7 } },
  { key: 'reforcada', name: 'Reforçada', bonus: 5, rank: 'General de Guerra', defense: { Estige: 9, Ferro: 7 } },
];

export const armorByKey = (key: string | null | undefined): ArmorKind | undefined =>
  ARMORS.find((a) => a.key === key);

export const materialsOf = (kind: ArmorKind): Material[] => Object.keys(kind.defense) as Material[];

/** Resistência = defesa da armadura escolhida (0 sem armadura ou combinação inválida). */
export function resistance(kindKey: string | null | undefined, material: string | null | undefined): number {
  const kind = armorByKey(kindKey);
  if (!kind || !material) return 0;
  return kind.defense[material as Material] ?? 0;
}

export function armorLabel(kindKey: string | null | undefined, material: string | null | undefined): string {
  const kind = armorByKey(kindKey);
  if (!kind) return 'Sem armadura';
  return `${kind.name} +${kind.bonus}${material ? ` de ${material}` : ''}`;
}

// ---------- Armas ----------------------------------------------------

export interface WeaponDef {
  key: string;
  name: string;
  dice: string; // ex.: "1d10"
  attr: AttrKey; // atributo somado ao dano
  req: number; // requisito mínimo nesse atributo
}

export const WEAPONS: WeaponDef[] = [
  { key: 'espada-curta', name: 'Espada curta', dice: '1d10', attr: 'fisico', req: 1 },
  { key: 'espada-longa', name: 'Espada longa', dice: '1d12', attr: 'fisico', req: 2 },
  { key: 'adagas', name: 'Adagas', dice: '1d10', attr: 'fisico', req: 1 },
  { key: 'machado', name: 'Machado', dice: '1d10', attr: 'fisico', req: 1 },
  { key: 'machado-de-guerra', name: 'Machado de guerra', dice: '1d12', attr: 'fisico', req: 3 },
  { key: 'maca', name: 'Maça', dice: '1d10', attr: 'fisico', req: 1 },
  { key: 'clava', name: 'Clava', dice: '1d12', attr: 'fisico', req: 2 },
  { key: 'martelo-de-guerra', name: 'Martelo de guerra', dice: '2d10', attr: 'fisico', req: 3 },
  { key: 'lanca', name: 'Lança', dice: '1d10', attr: 'fisico', req: 1 },
  { key: 'alabarda', name: 'Alabarda', dice: '1d12', attr: 'fisico', req: 2 },
  { key: 'arco-curto', name: 'Arco curto', dice: '1d10', attr: 'mental', req: 1 },
  { key: 'arco-longo', name: 'Arco longo', dice: '1d12', attr: 'mental', req: 2 },
  { key: 'besta', name: 'Besta', dice: '1d12', attr: 'mental', req: 2 },
  { key: 'besta-energizada', name: 'Besta energizada', dice: '2d10', attr: 'mental', req: 3 },
];

export const weaponByKey = (key: string | null | undefined): WeaponDef | undefined =>
  WEAPONS.find((w) => w.key === key);

/** Expressão de dano: dado da arma + atributo (já com bônus de classe). */
export const weaponDamageExpression = (w: WeaponDef, attrTotal: number): string =>
  `${w.dice}+${Math.max(0, attrTotal)}`;

export const weaponDamageLabel = (w: WeaponDef): string => `${w.dice} + ${attrName(w.attr)}`;

export const meetsRequirement = (w: WeaponDef, attrTotal: number): boolean => attrTotal >= w.req;

// ---------- Recursos iniciais ---------------------------------------

/**
 * FICHA.md:
 *  Vida     = rolar o Físico + valor da classe
 *  Postura  = rolar o Físico
 *  Stamina  = rolar o Espiritual + valor da classe
 * "Rolar" um atributo é o teste padrão (Nd20kh1).
 */
export const STARTING_ROLLS = {
  vida: (fisico: number, classVida: number) => `${testExpression(fisico)}+${classVida} Vida`,
  postura: (fisico: number) => `${testExpression(fisico)} Postura`,
  stamina: (espiritual: number, classStamina: number) => `${testExpression(espiritual)}+${classStamina} Stamina`,
} as const;
