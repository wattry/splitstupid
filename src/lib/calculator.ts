export type Op = '+' | '-' | '*' | '/';

export interface CalcState {
  /** Current display text ("0", "12.5", "Error"). */
  display: string;
  /** Left operand accumulated so far, null before the first operator. */
  acc: number | null;
  /** Pending operator waiting for its right operand. */
  op: Op | null;
  /** True right after an operator or "=": the next digit starts a new number. */
  waiting: boolean;
}

export const initialState: CalcState = {
  display: '0',
  acc: null,
  op: null,
  waiting: false
};

const OPS: Record<Op, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b
};

// Round away binary-float noise (0.1 + 0.2) while keeping 12 significant digits.
const format = (n: number): string => Number.isFinite(n) ? String(Number(n.toPrecision(12))) : 'Error';

const isOp = (key: string): key is Op => key in OPS;

export function input(state: CalcState, key: string): CalcState {
  const errored = state.display === 'Error';

  if (key === 'C') return initialState;

  if (/^\d$/.test(key)) {
    if (state.waiting || errored) return { ...state, display: key, waiting: false };
    return {
      ...state,
      display: state.display === '0' ? key : state.display + key
    };
  }

  if (errored) return state;

  if (key === '.') {
    if (state.waiting) return { ...state, display: '0.', waiting: false };
    if (state.display.includes('.')) return state;
    return { ...state, display: state.display + '.' };
  }

  if (key === '⌫') {
    if (state.waiting) return state;
    const next = state.display.slice(0, -1);
    return { ...state, display: next === '' || next === '-' ? '0' : next };
  }

  if (isOp(key)) {
    // Chained op (2 + 3 +) resolves the pending one first.
    const resolved =
      state.op !== null && state.acc !== null && !state.waiting
        ? OPS[state.op](state.acc, parseFloat(state.display))
        : parseFloat(state.display);
    return { display: format(resolved), acc: resolved, op: key, waiting: true };
  }

  if (key === '=') {
    if (state.op === null || state.acc === null) return state;
    const result = OPS[state.op](state.acc, parseFloat(state.display));
    return { display: format(result), acc: null, op: null, waiting: true };
  }

  return state;
}
