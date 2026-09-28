import type { AnchorKindSpec } from '@into-cps-association/dtaas-sdk';
import { GLOBAL_ID_PATTERN } from 'src/core';

const anchorKinds: AnchorKindSpec[] = [
  {
    kind: 'ifc-guid',
    substrates: ['aec'],
    label: 'IFC GlobalId',
    validateRef: (ref) => GLOBAL_ID_PATTERN.test(ref),
    resolve: (anchor, adapter) => adapter.resolve(anchor),
  },
];

export default anchorKinds;
