import { describe, expect, it } from 'vitest';
import type { ForgeOutcome } from '../lib/types';
import { angularDistance, classify, gradeOf, METALS, RARITIES, summarize, testParams, totalTests, WEAPON_GROUPS, WEAPON_TYPES, type ForgeConfig } from './logic';

const cfg = (rarity: string, metal: string, components = 0): ForgeConfig => ({
  weapon: 'Espada',
  rarity: RARITIES.find((r) => r.key === rarity)!,
  metal: METALS.find((m) => m.key === metal)!,
  components,
  smithLevel: 1,
});

describe('forja', () => {
  it('total de testes = raridade + metal + componentes', () => {
    expect(totalTests(cfg('comum', 'ferro'))).toBe(4); // 3 + 1
    expect(totalTests(cfg('rara', 'mithril', 2))).toBe(10); // 5 + 3 + 2
  });

  it('componentes são limitados a 0..5', () => {
    expect(totalTests(cfg('comum', 'ferro', 99))).toBe(9);
    expect(totalTests(cfg('comum', 'ferro', -4))).toBe(4);
  });

  it('classifica pela distância ao centro', () => {
    const z = 20;
    expect(classify(0, z)).toBe('Perfeito');
    expect(classify(z * 0.18, z)).toBe('Perfeito');
    expect(classify(z * 0.3, z)).toBe('Melhor');
    expect(classify(z * 0.9, z)).toBe('Bom');
    expect(classify(z + 0.1, z)).toBe('Falha');
  });

  it('distância angular dá a volta no círculo', () => {
    expect(angularDistance(350, 10)).toBe(20);
    expect(angularDistance(10, 350)).toBe(20);
  });

  it('dificuldade: zona encolhe e ponteiro acelera, com limites', () => {
    const easy = testParams(4);
    const hard = testParams(46);
    expect(hard.zone).toBeLessThan(easy.zone);
    expect(hard.speed).toBeGreaterThan(easy.speed);
    expect(hard.zone).toBeGreaterThanOrEqual(5);
    expect(testParams(10, 1).speed).toBeGreaterThan(testParams(10, 0).speed);
  });

  it('resumo: dano = perfeitos; durabilidade = base + melhores + perfeitos - críticas', () => {
    const r: ForgeOutcome[] = ['Perfeito', 'Perfeito', 'Melhor', 'Bom', 'Falha crítica']; // comum+ferro+? total 4 → usa 5 de propósito
    const s = summarize(cfg('comum', 'ferro', 1), r);
    expect(s.damageBonus).toBe(2);
    expect(s.durability).toBe(3 + 1 + 2 - 1);
    expect(s.divineOk).toBeNull();
  });

  it('durabilidade nunca fica negativa', () => {
    const s = summarize(cfg('comum', 'ferro'), ['Falha crítica', 'Falha crítica', 'Falha crítica', 'Falha crítica']);
    expect(s.durability).toBe(0);
  });

  it('divina só conclui com todos os golpes perfeitos', () => {
    const c = cfg('divina', 'ferro');
    const n = totalTests(c);
    const all = Array<ForgeOutcome>(n).fill('Perfeito');
    expect(summarize(c, all).divineOk).toBe(true);
    expect(summarize(c, [...all.slice(1), 'Melhor']).divineOk).toBe(false);
    expect(summarize(c, all.slice(1)).divineOk).toBe(false);
  });

  it('os grupos de armas cobrem todas as armas, sem repetir', () => {
    const all = WEAPON_GROUPS.flatMap((g) => g.items);
    expect([...all].sort()).toEqual([...WEAPON_TYPES].sort());
  });

  it('nota: tudo perfeito é S; muitas falhas críticas derrubam', () => {
    expect(gradeOf({ tests: 10, perfects: 10, betters: 0, goods: 0, criticals: 0 }).grade).toBe('S');
    expect(gradeOf({ tests: 10, perfects: 0, betters: 0, goods: 0, criticals: 10 }).grade).toBe('D');
    expect(gradeOf({ tests: 10, perfects: 5, betters: 3, goods: 2, criticals: 0 }).grade).toBe('A');
  });
});
