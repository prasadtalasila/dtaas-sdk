import type { Converter } from '@into-cps-association/dtaas-sdk';
import { convertIfc } from 'src/converter';
import exportGlb from 'src/react/exportGlb';
import { meshesFrom } from 'src/react/ifcMeshes';

/** IFC → GLB in the browser: the same path the Buildings page uses. */
const ifcToGlb: Converter = async ({ bytes }) => {
  const converted = await convertIfc(bytes);
  return {
    format: 'glb',
    bytes: await exportGlb(meshesFrom(converted)),
    metadata: {
      schema: converted.schema,
      objects: converted.objects.length,
      failed: converted.failed,
    },
  };
};

export default ifcToGlb;
