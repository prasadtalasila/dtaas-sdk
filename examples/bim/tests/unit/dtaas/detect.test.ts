import type { DigitalTwinSummary } from '@into-cps-association/dtaas-sdk';
import isBimTwin from 'src/dtaas/detect';

const twin = (
  overrides: Partial<DigitalTwinSummary> = {},
): DigitalTwinSummary => ({
  name: 't',
  path: 'p',
  files: [],
  ...overrides,
});

describe('isBimTwin', () => {
  it('claims a twin whose domain is bim', () => {
    expect(isBimTwin(twin({ domain: 'bim' }))).toBe(true);
  });

  it('claims a twin holding an IFC file, case-insensitively', () => {
    expect(isBimTwin(twin({ files: ['model/Hospital.IFC'] }))).toBe(true);
  });

  it('does not claim a twin with neither an IFC file nor the bim domain', () => {
    expect(isBimTwin(twin({ files: ['a.glb'] }))).toBe(false);
  });
});
