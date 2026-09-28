import type { Anchor, SubstrateAdapter } from '@into-cps-association/dtaas-sdk';
import anchorKinds from 'src/dtaas/anchors';

const [ifcGuid] = anchorKinds;

const anchor = (ref: string): Anchor => ({
  signalPath: 'room1/temperature',
  kind: 'ifc-guid',
  ref,
});

describe('anchorKinds (ifc-guid)', () => {
  it('is the ifc-guid kind, scoped to the aec substrate', () => {
    expect(ifcGuid.kind).toBe('ifc-guid');
    expect(ifcGuid.substrates).toEqual(['aec']);
  });

  it('validates a GlobalId and rejects anything else', () => {
    expect(ifcGuid.validateRef?.('0_sgz7bzz4Jh2ckU1ehFe$')).toBe(true);
    expect(ifcGuid.validateRef?.('abc')).toBe(false);
  });

  it('resolves through the substrate adapter, passing the anchor through', () => {
    const elementRef = { substrate: 'aec', id: 'x' };
    const resolve = jest.fn().mockReturnValue(elementRef);
    const adapter = { resolve } as unknown as SubstrateAdapter;
    const ref = anchor('0_sgz7bzz4Jh2ckU1ehFe$');

    expect(ifcGuid.resolve(ref, adapter)).toBe(elementRef);
    expect(resolve).toHaveBeenCalledWith(ref);
  });
});
