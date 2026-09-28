import { encodingPresetSchema } from '@into-cps-association/dtaas-sdk/schema';
import presets from 'src/dtaas/presets';

describe('bim presets', () => {
  it('every preset satisfies the encoding preset schema', () => {
    presets.forEach((preset) => {
      expect(encodingPresetSchema.safeParse(preset).success).toBe(true);
    });
  });

  it('defines thermal comfort over 18-26 °C on the aec substrate', () => {
    const preset = presets.find((p) => p.id === 'bim.thermal-comfort');
    expect(preset?.substrate).toBe('aec');
    expect(preset?.encodings[0].encoding).toMatchObject({ domain: [18, 26] });
  });

  it('defines CO2 over 400-1400 ppm on the aec substrate', () => {
    const preset = presets.find((p) => p.id === 'bim.co2');
    expect(preset?.substrate).toBe('aec');
    expect(preset?.encodings[0].encoding).toMatchObject({
      domain: [400, 1400],
    });
  });
});
