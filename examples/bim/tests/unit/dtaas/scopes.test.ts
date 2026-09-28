import type { SubstrateAdapter } from '@into-cps-association/dtaas-sdk';
import scopes from 'src/dtaas/scopes';

const handles: Record<string, unknown> = {
  a: { userData: { room: 'R1', storey: 'L1' } },
  b: { userData: { room: 'R1', storey: 'L2' } },
  c: { userData: { room: 'constructor', storey: '__proto__' } },
  d: { userData: {} },
};
const adapter = {
  resolve: ({ ref }: { ref: string }) =>
    ref in handles ? { substrate: 'aec', id: ref, handle: handles[ref] } : null,
} as unknown as SubstrateAdapter;

const ids = ['a', 'b', 'c', 'd', 'zz'];

// Read through a variable, never the literal: eslint's `no-proto` flags any
// direct `__proto__` access (dot or bracket) as the deprecated accessor,
// even though this is our own data property, not the real prototype link.
const PROTO_KEY = '__proto__';

describe('bim.room', () => {
  it('groups elements by room, dropping those without one', () => {
    const room = scopes.find((s) => s.id === 'bim.room');
    const result = room?.group(ids, { adapter });
    expect(Object.keys(result ?? {})).toEqual(['R1', 'constructor']);
    expect(result).toEqual({ R1: ['a', 'b'], constructor: ['c'] });
    expect(Array.isArray(result?.constructor)).toBe(true);
  });
});

describe('bim.storey', () => {
  it('groups elements by storey, including __proto__ as an own key', () => {
    const storey = scopes.find((s) => s.id === 'bim.storey');
    // Built with bracket access throughout: `{ __proto__: … }` as an object
    // literal sets the prototype instead of an own property, which is
    // exactly the trap `Object.fromEntries` in the implementation avoids.
    const result = storey?.group(ids, { adapter }) ?? {};
    // `Object.hasOwn` needs an ES2022 lib the project's tsconfig does not
    // enable; this is the ES5-safe equivalent the brief's check reduces to.
    expect(Object.prototype.hasOwnProperty.call(result, PROTO_KEY)).toBe(true);
    expect(Object.keys(result)).toEqual(['L1', 'L2', PROTO_KEY]);
    expect(result.L1).toEqual(['a']);
    expect(result.L2).toEqual(['b']);
    expect(result[PROTO_KEY]).toEqual(['c']);
  });
});
