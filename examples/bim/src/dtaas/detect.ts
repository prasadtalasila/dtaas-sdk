import type { DigitalTwinSummary } from '@into-cps-association/dtaas-sdk';

const isBimTwin = (dt: DigitalTwinSummary): boolean =>
  dt.domain === 'bim' ||
  dt.files.some((file) => file.toLowerCase().endsWith('.ifc'));

export default isBimTwin;
