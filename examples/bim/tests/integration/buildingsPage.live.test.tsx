/**
 * Integration test for BuildingsPage wired to live readings: a sample pushed
 * through `host.signals` reaches a sensor card, and the card follows the
 * connection state, not just the value.
 */

import { act, screen } from '@testing-library/react';
import {
  fakeHostServices,
  renderWithHost,
  type FakeHostServices,
} from '@into-cps-association/dtaas-sdk/testing';
import { BIM_ROOT } from 'src/dtaas/ids';
import {
  canvas,
  canvasProps,
  viewerReady,
} from 'tests/unit/react/buildingModels.support';
import {
  HOSPITAL_A_TOPIC,
  LIBRARY_FILES,
  stubLibraryFetch,
} from 'tests/fixtures/library';
import { BuildingsPageRoutes } from 'tests/integration/buildingsPageRoutes';

jest.mock('src/react/BimCanvas', () => ({
  __esModule: true,
  default: jest.requireActual('tests/unit/react/buildingModels.support')
    .StandInCanvas,
}));

const NOW = 1_700_000_000_000;

beforeEach(() => {
  canvas.props = null;
  canvas.mounts = 0;
  stubLibraryFetch();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** hospital-a, open and ready, with its one binding on screen. */
async function showHospitalA(): Promise<FakeHostServices> {
  const host = fakeHostServices({ extensionId: 'bim', files: LIBRARY_FILES });
  renderWithHost(<BuildingsPageRoutes />, {
    host,
    route: `${BIM_ROOT}/models/hospital-a?dir=common/models`,
  });

  await screen.findByTestId('canvas');
  await viewerReady();
  // The sensor card is on screen, with no reading yet.
  await screen.findByText('Waiting');
  return host;
}

const emitTemperature = (host: FakeHostServices, value: number) =>
  act(() => {
    host.signals.emit({
      twinId: 'h',
      signalPath: HOSPITAL_A_TOPIC,
      channel: 'measured',
      ts: NOW,
      value,
    });
  });

test('a reading pushed through the host shows on the sensor card, with its age', async () => {
  const host = await showHospitalA();

  emitTemperature(host, 21.5);

  expect(await screen.findByText('21.5 °C')).toBeTruthy();
  expect(screen.getByText('updated 0 s ago')).toBeTruthy();
});

test('a downed connection marks the card not live, without clearing the value', async () => {
  const host = await showHospitalA();
  emitTemperature(host, 21.5);
  await screen.findByText('21.5 °C');

  act(() => host.signals.setConnection('down'));

  expect(await screen.findByText(/not live/)).toBeTruthy();
  expect(screen.getByText('21.5 °C')).toBeTruthy();
});

test('live readings leave the geometry save callback unchanged', async () => {
  const host = await showHospitalA();
  const before = canvasProps().onConverted;

  emitTemperature(host, 21.5);
  await screen.findByText('21.5 °C');

  expect(canvasProps().onConverted).toBe(before);
});
