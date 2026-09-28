/**
 * Integration tests for BuildingsPage: folder and model routing through the
 * host's contents API, and the one write the page makes back to it, a
 * converted GLB.
 *
 * `BimCanvas` is replaced by the same stand-in the BuildingModels unit tests
 * use: it draws nothing, but records what it was given and lets a test tell
 * the page a conversion finished.
 */

import { act, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import {
  fakeHostServices,
  renderWithHost,
} from '@into-cps-association/dtaas-sdk/testing';
import { BIM_ROOT } from 'src/dtaas/ids';
import { canvas, canvasProps } from 'tests/unit/react/buildingModels.support';
import { LIBRARY_FILES, stubLibraryFetch } from 'tests/fixtures/library';
import { BuildingsPageRoutes } from 'tests/integration/buildingsPageRoutes';

jest.mock('src/react/BimCanvas', () => ({
  __esModule: true,
  default: jest.requireActual('tests/unit/react/buildingModels.support')
    .StandInCanvas,
}));

/** Where navigation landed, so a test can see a route change without reading history directly. */
function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function App() {
  return (
    <>
      <LocationProbe />
      <BuildingsPageRoutes />
    </>
  );
}

const modelMenu = () => screen.getByRole('combobox', { name: /^IFC Model/ });

async function chooseModel(user: UserEvent, name: string) {
  await user.click(modelMenu());
  await user.click(
    await screen.findByRole('option', { name: new RegExp(name) }),
  );
}

async function up(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'Up' }));
}

async function enter(user: UserEvent, name: string) {
  await user.click(await screen.findByRole('button', { name }));
}

const host = () =>
  fakeHostServices({ extensionId: 'bim', files: LIBRARY_FILES });

beforeEach(() => {
  canvas.props = null;
  canvas.mounts = 0;
  stubLibraryFetch();
});

describe('the folder a person browses to', () => {
  it('lists the host-convention default through host.contents.list', async () => {
    const bim = host();
    const list = jest.spyOn(bim.contents, 'list');
    renderWithHost(<App />, { host: bim, route: BIM_ROOT });

    expect(await screen.findByText(/2 IFC models/)).toBeTruthy();
    expect(list).toHaveBeenCalledWith('common/models');
    expect(
      screen.getByRole('button', { name: 'Folder: common/models' }),
    ).toBeTruthy();
  });

  it('is read from ?dir= when one is given', async () => {
    const user = userEvent.setup();
    renderWithHost(<App />, {
      host: host(),
      route: `${BIM_ROOT}?dir=projects/aarhus`,
    });

    await screen.findByText(/1 IFC model/);
    await user.click(modelMenu());
    expect(await screen.findByRole('option', { name: /tower/ })).toBeTruthy();
  });

  it('falls back to the extension config when ?dir= is absent', async () => {
    const bim = fakeHostServices({
      extensionId: 'bim',
      files: LIBRARY_FILES,
      env: { REACT_APP_EXT_BIM_MODELS_DIRECTORY: 'projects/aarhus' },
    });
    const user = userEvent.setup();
    renderWithHost(<App />, { host: bim, route: BIM_ROOT });

    await screen.findByText(/1 IFC model/);
    await user.click(modelMenu());
    expect(await screen.findByRole('option', { name: /tower/ })).toBeTruthy();
  });

  it('is rejected, without ever being listed, when it could leave the library', async () => {
    const bim = host();
    const list = jest.spyOn(bim.contents, 'list');
    renderWithHost(<App />, {
      host: bim,
      route: `${BIM_ROOT}?dir=projects/%2e%2e/secret`,
    });

    expect(
      await screen.findByText(/is not a folder in your library/),
    ).toBeTruthy();
    expect(list).not.toHaveBeenCalled();
  });
});

it('names a model the folder does not have', async () => {
  renderWithHost(<App />, {
    host: host(),
    route: `${BIM_ROOT}/models/gone?dir=common/models`,
  });

  expect(
    await screen.findByText('No model named gone in common/models'),
  ).toBeTruthy();
});

it('moves to the model route when a model is chosen from the menu', async () => {
  const user = userEvent.setup();
  renderWithHost(<App />, { host: host(), route: BIM_ROOT });
  await screen.findByText(/2 IFC models/);

  await chooseModel(user, 'office-b');

  expect(
    await screen.findByText('/bim/models/office-b?dir=common/models'),
  ).toBeTruthy();
});

it('moves to the folder chosen in the directory picker', async () => {
  const user = userEvent.setup();
  renderWithHost(<App />, { host: host(), route: BIM_ROOT });
  await screen.findByText(/2 IFC models/);

  await user.click(
    screen.getByRole('button', { name: 'Folder: common/models' }),
  );
  await up(user); // common/models -> common
  await up(user); // common -> the library root
  await enter(user, 'projects');
  await enter(user, 'aarhus');
  await user.click(screen.getByRole('button', { name: 'Use this folder' }));

  expect(await screen.findByText('/bim?dir=projects/aarhus')).toBeTruthy();
});

it('stores a converted GLB through the host and says so', async () => {
  const bim = host();
  const user = userEvent.setup();
  renderWithHost(<App />, { host: bim, route: BIM_ROOT });
  await screen.findByText(/2 IFC models/);

  await chooseModel(user, 'hospital-a');
  await screen.findByText('/bim/models/hospital-a?dir=common/models');
  await screen.findByTestId('canvas');

  const glb = new Uint8Array([1, 2, 3]);
  await act(async () => {
    canvasProps().onConverted?.(glb);
  });

  expect(bim.contents.files.get('common/models/hospital-a.glb')).toEqual(glb);
  expect(await screen.findByText(/Stored in the library/)).toBeTruthy();
});
