import dtaasKitConfig from 'src/eslint';

describe('dtaasKitConfig', () => {
  it('is a named flat-config array', () => {
    expect(Array.isArray(dtaasKitConfig)).toBe(true);
    expect(dtaasKitConfig[0].name).toBe('@into-cps-association/dtaas-sdk/kit');
  });

  it('only uses core rules, so kits need no extra plugin', () => {
    const rules = Object.keys(dtaasKitConfig[0].rules ?? {});
    expect(rules.sort()).toEqual([
      'no-restricted-globals',
      'no-restricted-imports',
      'no-restricted-properties',
    ]);
    expect(dtaasKitConfig[0].plugins).toBeUndefined();
  });
});
