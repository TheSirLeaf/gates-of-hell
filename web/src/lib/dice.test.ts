import { describe, expect, it } from 'vitest';
import { DiceRollError, rollCommand, type Rng } from './dice';

/** RNG determinístico: devolve a sequência dada (valores 0-based) em loop. */
const seq =
  (...values: number[]): Rng =>
  (max) => {
    const v = values.shift() ?? 0;
    return v % max;
  };

describe('rollCommand', () => {
  it('rola dados simples com modificador', () => {
    const [r] = rollCommand('d20+5 ataque', seq(9)); // 10
    expect(r.total).toBe(15);
    expect(r.label).toBe('ataque');
    expect(r.expression).toBe('1d20 + 5');
  });

  it('teste de atributo: Nd20kh1 mantém o maior', () => {
    const [r] = rollCommand('3d20kh1+2', seq(4, 17, 9)); // 5, 18, 10
    expect(r.total).toBe(20);
    expect(r.dice.filter((d) => d.dropped)).toHaveLength(2);
  });

  it('4d6dl1 descarta o menor', () => {
    const [r] = rollCommand('4d6dl1', seq(0, 5, 3, 2)); // 1,6,4,3
    expect(r.total).toBe(13);
  });

  it('repetição 3#d6', () => {
    expect(rollCommand('3#d6', seq(0, 1, 2)).map((r) => r.total)).toEqual([1, 2, 3]);
  });

  it('colchetes inline geram várias rolagens nomeadas', () => {
    const res = rollCommand('[d20+5 ataque] [2d6+3 dano]', seq(0, 0, 0));
    expect(res).toHaveLength(2);
    expect(res[1].label).toBe('dano');
    expect(res[1].total).toBe(5);
  });

  it('comparação marca sucesso', () => {
    expect(rollCommand('d20 >= 15', seq(14))[0].success).toBe(true);
    expect(rollCommand('d20 >= 15', seq(0))[0].success).toBe(false);
  });

  it('contagem << conta dados abaixo do limite', () => {
    const [r] = rollCommand('4d6 << 3', seq(0, 1, 2, 5)); // 1,2,3,6
    expect(r.total).toBe(3);
  });

  it('--N subtrai de cada dado', () => {
    const [r] = rollCommand('2d6--1', seq(3, 4)); // 4,5 -> 3,4
    expect(r.total).toBe(7);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => rollCommand('')).toThrow(DiceRollError);
    expect(() => rollCommand('101d6')).toThrow(DiceRollError);
    expect(() => rollCommand('d1')).toThrow(DiceRollError);
    expect(() => rollCommand('21#d6')).toThrow(DiceRollError);
    expect(() => rollCommand('d6/0')).toThrow(DiceRollError);
  });
});
