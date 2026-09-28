import type {
  ScopeRule,
  SubstrateAdapter,
} from '@into-cps-association/dtaas-sdk';

type Fact = 'room' | 'storey';

/** Room or storey the aec substrate copied from the property tree. */
const factOf = (adapter: SubstrateAdapter, ref: string, fact: Fact) => {
  const element = adapter.resolve({ kind: 'ifc-guid', ref, signalPath: ref });
  const data = (element?.handle as { userData?: Record<string, unknown> })
    ?.userData;
  const value = data?.[fact];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/** A `Map` first, so names such as `__proto__` become ordinary keys. */
const groupBy =
  (fact: Fact): ScopeRule['group'] =>
  (elementIds, { adapter }) => {
    const groups = new Map<string, string[]>();
    elementIds.forEach((id) => {
      const key = factOf(adapter, id, fact);
      if (key !== undefined) groups.set(key, [...(groups.get(key) ?? []), id]);
    });
    return Object.fromEntries(groups);
  };

const scopes: ScopeRule[] = [
  { id: 'bim.room', label: 'Per room', group: groupBy('room') },
  { id: 'bim.storey', label: 'Per storey', group: groupBy('storey') },
];

export default scopes;
