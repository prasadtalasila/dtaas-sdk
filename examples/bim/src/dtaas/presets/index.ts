import type { EncodingPreset } from '@into-cps-association/dtaas-sdk';

const presets: EncodingPreset[] = [
  {
    id: 'bim.thermal-comfort',
    label: 'Thermal comfort',
    description: 'Colours each room by its measured temperature, 18–26 °C.',
    substrate: 'aec',
    encodings: [
      {
        target: '*/temperature',
        encoding: {
          type: 'colorScale',
          domain: [18, 26],
          scheme: 'bim.cold-warm',
          channel: 'measured',
          clamp: true,
        },
      },
    ],
  },
  {
    id: 'bim.co2',
    label: 'CO₂',
    description: 'Colours each room by its measured CO₂, 400–1400 ppm.',
    substrate: 'aec',
    encodings: [
      {
        target: '*/co2',
        encoding: {
          type: 'colorScale',
          domain: [400, 1400],
          scheme: 'bim.cold-warm',
          channel: 'measured',
          clamp: true,
        },
      },
    ],
  },
];

export default presets;
