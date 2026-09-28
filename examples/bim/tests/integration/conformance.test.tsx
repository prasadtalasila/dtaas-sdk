/**
 * Conformance tests for the bim extension itself: static validation, the
 * SDK's runtime harness, its `setup()` guard, and twin detection.
 */

import { validateExtension } from '@into-cps-association/dtaas-sdk';
import {
  checkConformance,
  fakeHostServices,
} from '@into-cps-association/dtaas-sdk/testing';
import extension from 'src/dtaas';

describe('the bim extension', () => {
  it('passes static validation', () => {
    expect(validateExtension(extension)).toEqual({ valid: true, errors: [] });
  });

  it('passes the conformance harness and logs readiness', async () => {
    const host = fakeHostServices({ extensionId: 'bim' });
    await expect(checkConformance(extension, { host })).resolves.toEqual({
      passed: true,
      errors: [],
    });
    expect(host.recorded.logs).toContainEqual({
      level: 'info',
      args: ['bim ready'],
    });
  });

  it('fails conformance when the models directory is configured empty', async () => {
    const host = fakeHostServices({
      extensionId: 'bim',
      env: { REACT_APP_EXT_BIM_MODELS_DIRECTORY: '' },
    });
    const report = await checkConformance(extension, { host });

    expect(report.passed).toBe(false);
    expect(report.errors[0]).toMatch(
      /^setup\(\) failed: Invalid configuration for extension "bim"/,
    );
  });

  it('claims a twin with an IFC file among its files', async () => {
    const detect = extension.visualisation?.detect;
    const twin = { name: 'h', path: 'dt/h', files: ['h.ifc'] };

    expect(await detect?.(twin)).toBe(true);
  });
});
