/**
 * The real BimCanvas under BuildingsPage: a live reading re-renders the page,
 * and that must not tear down and reload the 3D scene. Only the scene mount
 * is stood in for, since jsdom has no WebGL.
 */

import { act, screen, waitFor } from '@testing-library/react';
import {
  fakeHostServices,
  renderWithHost,
  type FakeHostServices,
} from '@into-cps-association/dtaas-sdk/testing';
import type { BimCanvasProps } from 'src/react/BimCanvas';
import { mountCanvas } from 'src/react/canvasMount';
import { BIM_ROOT } from 'src/dtaas/ids';
import { building } from 'tests/unit/react/buildingModels.fixtures';
import {
  HOSPITAL_A_TOPIC,
  LIBRARY_FILES,
  stubLibraryFetch,
} from 'tests/fixtures/library';
import { BuildingsPageRoutes } from 'tests/integration/buildingsPageRoutes';

jest.mock('src/react/canvasMount', () => ({
  mountCanvas: jest.fn(() => () => {}),
}));

const mounted = jest.mocked(mountCanvas);

/** The props the scene was last mounted with. */
const lastMount = (): Readonly<BimCanvasProps> => {
  const call = mounted.mock.lastCall;
  if (!call) throw new Error('the scene has not been mounted');
  return call[1];
};

beforeEach(() => {
  mounted.mockClear();
  stubLibraryFetch();
});

/** hospital-a open, its scene mounted with its one binding, and ready. */
async function showHospitalA(): Promise<FakeHostServices> {
  const host = fakeHostServices({ extensionId: 'bim', files: LIBRARY_FILES });
  renderWithHost(<BuildingsPageRoutes />, {
    host,
    route: `${BIM_ROOT}/models/hospital-a?dir=common/models`,
  });
  await waitFor(() => expect(lastMount().bindings).toHaveLength(1));
  const view = building();
  await act(async () => {
    lastMount().onReady?.({
      view,
      frame: () => {},
      look: () => {},
      drawField: () => {},
    });
  });
  await screen.findByText('Waiting');
  return host;
}

const emitTemperature = (host: FakeHostServices, value: number) =>
  act(() => {
    host.signals.emit({
      twinId: 'h',
      signalPath: HOSPITAL_A_TOPIC,
      channel: 'measured',
      ts: Date.now(),
      value,
    });
  });

test('live readings update the cards without remounting the scene', async () => {
  const host = await showHospitalA();
  const before = mounted.mock.calls.length;

  [20, 21, 22, 23, 24].forEach((value) => emitTemperature(host, value));

  expect(await screen.findByText('24.0 °C')).toBeTruthy();
  expect(mounted.mock.calls.length).toBe(before);
  expect(before).toBe(1);
});
