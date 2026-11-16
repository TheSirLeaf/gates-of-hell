/**
 * Regras da Forja (lógica pura, sem UI) — baseada em forja_prototipo-2.html.
 * Valores marcados como PROVISÓRIOS ainda aguardam definição do mestre.
 */
import type { ForgeOutcome, ForgePayload } from '../lib/types';

export const WEAPON_TYPES = [
  'Adaga', 'Espada', 'Espada longa', 'Florete', 'Katana', 'Martelo', 'Clava', 'Maça', 'Lança', 'Bastão',
  'Nunchaku', 'Foice', 'Tridente', 'Estrela da Manhã', 'Garras', 'Picareta', 'Porrete dentado', 'Sai',
  'Cajado', 'Varinha', 'Orbe elemental', 'Grimório', 'Arco curto', 'Arco longo', 'Besta', 'Zarabatana',
  'Pistola', 'Soqueira', 'Chicote', 'Cimitarra', 'Machado', 'Kusarigama', 'Correntes', 'Boleadeira',
] as const;

export interface Rarity {
  key: string;
  name: string;
  tests: number;
  note?: string;
}

export const RARITIES: Rarity[] = [
  { key: 'comum', name: 'Comum', tests: 3 },
  { key: 'rara', name: 'Rara', tests: 5 },
  { key: 'lendaria', name: 'Lendária', tests: 9 },
  { key: 'heroica', name: 'Heróica', tests: 17 },
  { key: 'mitica', name: 'Mítica', tests: 23 },
  { key: 'divina', name: 'Divina', tests: 46, note: 'todos os golpes precisam ser perfeitos' },
];

export interface Metal {
  key: string;
  name: string;
  difficulty: number; // dificuldade somada aos testes
  durability: number; // durabilidade base
}

export const METALS: Metal[] = [
  { key: 'ferro', name: 'Ferro', difficulty: 1, durability: 3 },
  { key: 'aco', name: 'Aço', difficulty: 2, durability: 6 },
  { key: 'mithril', name: 'Mithril', difficulty: 3, durability: 12 },
  { key: 'adamantita', name: 'Adamantita', difficulty: 4, durability: 24 },
  { key: 'oricalco', name: 'Oricalco', difficulty: 5, durability: 48 },
];

export const MAX_COMPONENTS = 5;
export const SMITH_LEVELS = [1, 2, 3, 4, 5]; // PROVISÓRIO: limites por nível ainda não definidos

export interface ForgeConfig {
  weapon: string;
  rarity: Rarity;
  metal: Metal;
  components: number;
  smithLevel: number;
}

export const clampComponents = (n: number): number => Math.max(0, Math.min(MAX_COMPONENTS, Math.floor(n) || 0));

/** Total de testes = raridade + dificuldade do metal + componentes. */
export const totalTests = (c: Pick<ForgeConfig, 'rarity' | 'metal' | 'components'>): number =>
  c.rarity.tests + c.metal.difficulty + clampComponents(c.components);

export interface TestParams {
  /** Meia-largura (graus) da área acertável. PROVISÓRIO. */
  zone: number;
  /** Velocidade do ponteiro em graus/segundo. PROVISÓRIO. */
  speed: number;
  /** Janela (ms) em que o teste pode surgir após o início da espera. */
  minDelay: number;
  maxDelay: number;
}

/**
 * A dificuldade cresce com o total de testes (limitada a 40, como no protótipo).
 * Melhorias sobre o protótipo: a velocidade também sobe dentro da própria fabricação (`progress` 0..1),
 * dando uma sensação de aquecimento crescente.
 */
export function testParams(total: number, progress = 0): TestParams {
  const d = Math.min(total, 40);
  const zone = Math.max(5, 25 - d * 0.38);
  const speed = (1.7 + d * 0.085) * 1000 * 0.06 * (1 + Math.min(1, Math.max(0, progress)) * 0.25);
  return { zone, speed, minDelay: 650, maxDelay: 650 + Math.max(500, 1900 - d * 25) };
}

/** Frações da meia-largura para cada faixa. */
export const BANDS = { perfect: 0.18, better: 0.42 } as const;

export function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

export function classify(distance: number, zone: number): Exclude<ForgeOutcome, 'Falha crítica'> {
  if (distance <= zone * BANDS.perfect) return 'Perfeito';
  if (distance <= zone * BANDS.better) return 'Melhor';
  if (distance <= zone) return 'Bom';
  return 'Falha';
}

export interface ForgeSummary extends ForgePayload {}

export function summarize(config: ForgeConfig, results: ForgeOutcome[]): ForgeSummary {
  const count = (o: ForgeOutcome) => results.filter((r) => r === o).length;
  const perfects = count('Perfeito');
  const betters = count('Melhor');
  const goods = count('Bom');
  const misses = count('Falha');
  const criticals = count('Falha crítica');
  const tests = totalTests(config);
  const divine = config.rarity.key === 'divina';
  return {
    weapon: config.weapon,
    rarity: config.rarity.name,
    metal: config.metal.name,
    tests,
    perfects,
    betters,
    goods,
    misses,
    criticals,
    damageBonus: perfects,
    durability: Math.max(0, config.metal.durability + betters + perfects - criticals),
    divineOk: divine ? results.length === tests && perfects === tests : null,
    timeline: results,
  };
}

export const outcomeTone = (o: ForgeOutcome): 'perfect' | 'better' | 'good' | 'miss' | 'crit' =>
  o === 'Perfeito' ? 'perfect' : o === 'Melhor' ? 'better' : o === 'Bom' ? 'good' : o === 'Falha' ? 'miss' : 'crit';

export function itemName(s: Pick<ForgePayload, 'weapon' | 'rarity' | 'metal'>): string {
  return `${s.weapon} ${s.rarity.toLowerCase()} de ${s.metal}`;
}

/** Armas agrupadas para a seleção visual (cobre exatamente WEAPON_TYPES). */
export const WEAPON_GROUPS: { name: string; items: string[] }[] = [
  { name: 'Lâminas', items: ['Adaga', 'Espada', 'Espada longa', 'Florete', 'Katana', 'Cimitarra', 'Foice', 'Machado'] },
  { name: 'Impacto', items: ['Martelo', 'Clava', 'Maça', 'Bastão', 'Nunchaku', 'Estrela da Manhã', 'Porrete dentado', 'Soqueira', 'Picareta'] },
  { name: 'Hastes e correntes', items: ['Lança', 'Tridente', 'Kusarigama', 'Correntes', 'Chicote', 'Boleadeira'] },
  { name: 'Distância', items: ['Arco curto', 'Arco longo', 'Besta', 'Zarabatana', 'Pistola'] },
  { name: 'Arcanas', items: ['Cajado', 'Varinha', 'Orbe elemental', 'Grimório'] },
  { name: 'Outras', items: ['Garras', 'Sai'] },
];

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

/** Nota da peça: perfeitos pesam mais; falhas críticas descontam. */
export function gradeOf(s: Pick<ForgePayload, 'tests' | 'perfects' | 'betters' | 'goods' | 'criticals'>): { grade: Grade; score: number } {
  if (s.tests <= 0) return { grade: 'D', score: 0 };
  const raw = (s.perfects + s.betters * 0.6 + s.goods * 0.3) / s.tests - s.criticals * 0.15 / Math.max(1, s.tests / 4);
  const score = Math.max(0, Math.min(1, raw));
  const grade: Grade = score >= 0.9 ? 'S' : score >= 0.7 ? 'A' : score >= 0.5 ? 'B' : score >= 0.3 ? 'C' : 'D';
  return { grade, score };
}
