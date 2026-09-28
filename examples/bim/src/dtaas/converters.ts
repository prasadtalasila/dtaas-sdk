import type { ConverterSpec } from '@into-cps-association/dtaas-sdk';

const converters: ConverterSpec[] = [
  {
    id: 'bim.ifc-to-glb',
    from: ['.ifc'],
    to: 'glb',
    load: () => import('src/dtaas/converters/ifcToGlb'),
  },
];

export default converters;
