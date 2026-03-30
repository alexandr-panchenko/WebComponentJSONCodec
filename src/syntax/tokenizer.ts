export interface TokenizerState {
  input: string;
  index: number;
}

export function createTokenizer(input: string): TokenizerState {
  return { input, index: 0 };
}

export function eof(state: TokenizerState): boolean {
  return state.index >= state.input.length;
}

export function peek(state: TokenizerState, offset = 0): string {
  return state.input[state.index + offset] ?? "";
}

export function advance(state: TokenizerState, count = 1): string {
  const value = state.input.slice(state.index, state.index + count);
  state.index += count;
  return value;
}

export function consumeWhile(
  state: TokenizerState,
  predicate: (char: string) => boolean,
): string {
  const start = state.index;
  while (!eof(state) && predicate(peek(state))) {
    state.index += 1;
  }
  return state.input.slice(start, state.index);
}

export function skipWhitespace(state: TokenizerState): void {
  consumeWhile(state, (char) => /\s/.test(char));
}
