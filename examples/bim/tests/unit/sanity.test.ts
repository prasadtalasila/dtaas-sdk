import { SDK_MAJOR } from '@into-cps-association/dtaas-sdk';
import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import { BIM_EXTENSION_ID } from 'src/core';

describe('package wiring', () => {
  it('resolves the packed SDK, including connection status', () => {
    expect(SDK_MAJOR).toBe(1);
    expect(fakeHostServices().signals.connection.get()).toBe('live');
    expect(BIM_EXTENSION_ID).toBe('bim');
  });
});
