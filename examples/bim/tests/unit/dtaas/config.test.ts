import { readExtensionConfig } from '@into-cps-association/dtaas-sdk';
import configSchema from 'src/dtaas/config';

describe('bim config schema', () => {
  it('reads modelsDirectory from REACT_APP_EXT_BIM_MODELS_DIRECTORY', () => {
    const result = readExtensionConfig('bim', configSchema, {
      REACT_APP_EXT_BIM_MODELS_DIRECTORY: 'projects',
    });
    expect(result.success && result.data).toEqual({
      modelsDirectory: 'projects',
    });
  });

  it('is optional: an empty env yields an empty config', () => {
    const result = readExtensionConfig('bim', configSchema, {});
    expect(result.success && result.data).toEqual({});
  });

  it('rejects an empty string', () => {
    const result = readExtensionConfig('bim', configSchema, {
      REACT_APP_EXT_BIM_MODELS_DIRECTORY: '',
    });
    expect(result.success).toBe(false);
  });
});
