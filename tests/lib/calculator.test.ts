import { describe, it, expect } from 'vitest';
import { initialState, input, type CalcState } from '../../src/lib/calculator.js';

const press = (keys: string[], from: CalcState = initialState) =>
  keys.reduce((state, key) => input(state, key), from);

describe('calculator', () => {
  it('starts displaying 0', () => {
    expect(initialState.display).toBe('0');
  });

  it('enters digits', () => {
    expect(press(['1', '2', '3']).display).toBe('123');
  });

  it('replaces the leading zero', () => {
    expect(press(['0', '5']).display).toBe('5');
  });

  it('enters a decimal point once', () => {
    expect(press(['1', '.', '5', '.', '5']).display).toBe('1.55');
  });

  it('starts a decimal from zero', () => {
    expect(press(['.', '5']).display).toBe('0.5');
  });

  it('adds', () => {
    expect(press(['2', '+', '3', '=']).display).toBe('5');
  });

  it('subtracts', () => {
    expect(press(['9', '-', '4', '=']).display).toBe('5');
  });

  it('multiplies', () => {
    expect(press(['6', '*', '7', '=']).display).toBe('42');
  });

  it('divides', () => {
    expect(press(['1', '0', '/', '4', '=']).display).toBe('2.5');
  });

  it('chains operations left to right', () => {
    expect(press(['2', '+', '3', '*', '4', '=']).display).toBe('20');
  });

  it('shows an intermediate result when chaining', () => {
    expect(press(['2', '+', '3', '+']).display).toBe('5');
  });

  it('handles decimals without float noise', () => {
    expect(press(['0', '.', '1', '+', '0', '.', '2', '=']).display).toBe('0.3');
  });

  it('reports divide by zero as an error', () => {
    expect(press(['5', '/', '0', '=']).display).toBe('Error');
  });

  it('recovers from error on next digit', () => {
    const errored = press(['5', '/', '0', '=']);
    expect(press(['7'], errored).display).toBe('7');
  });

  it('clears with C', () => {
    expect(press(['1', '2', '+', '3', 'C'])).toEqual(initialState);
  });

  it('backspaces a digit', () => {
    expect(press(['1', '2', '3', '⌫']).display).toBe('12');
  });

  it('backspaces the last digit back to 0', () => {
    expect(press(['7', '⌫']).display).toBe('0');
  });

  it('continues from a result', () => {
    expect(press(['2', '+', '3', '=', '*', '2', '=']).display).toBe('10');
  });

  it('starts fresh when a digit follows equals', () => {
    expect(press(['2', '+', '3', '=', '4']).display).toBe('4');
  });
});
