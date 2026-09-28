/**
 * Tests for the building models page, rendered: the menu, the names read from
 * the files, and a listing that fails.
 *
 * These drive BuildingModels the way a person does, because the parts that
 * went wrong on this page were in how it behaved: a save that said nothing
 * while it happened, a model marked unconverted after it was stored, a name
 * that never arrived in the heading.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PAEDAGOGISK,
  SUBSTATION,
  TEMPLATE,
  canvas,
  choose,
  deferred,
  ifc,
  menuOptions,
  oneModel,
  open,
  show,
  workspace,
} from 'tests/unit/react/buildingModels.support';

jest.mock('src/react/BimCanvas', () => ({
  __esModule: true,
  default: jest.requireActual('tests/unit/react/buildingModels.support')
    .StandInCanvas,
}));

beforeEach(() => {
  canvas.props = null;
  canvas.mounts = 0;
});

test('the menu is named by the heading above it', async () => {
  oneModel();
  show();

  expect(
    await screen.findByRole('combobox', { name: /^IFC Model/ }),
  ).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'IFC Model' })).toBeTruthy();
});

test('a model is listed by its file name until its own name is read', async () => {
  const library = workspace({
    files: [ifc('Building_1911_AK_v2.ifc'), ifc('Building_1912_AK_v4.ifc')],
    heads: {
      'Building_1911_AK_v2.ifc': PAEDAGOGISK,
      'Building_1912_AK_v4.ifc': TEMPLATE,
    },
  });
  library.gate = deferred();
  const user = userEvent.setup();
  show();

  await screen.findByText(/2 IFC models in the shared library/);
  let options = await menuOptions(user);
  expect(options.some((text) => text.startsWith('Building 1911 AK v2'))).toBe(
    true,
  );

  await open(library.gate);

  options = (await screen.findAllByRole('option')).map(
    (option) => option.textContent ?? '',
  );
  expect(options.some((text) => text.startsWith('Pædagogisk Center'))).toBe(
    true,
  );
  // A template nobody filled in names nothing, so its file name stays.
  expect(options.some((text) => text.startsWith('Building 1912 AK v4'))).toBe(
    true,
  );
});

test('a name two files share is shown by neither', async () => {
  workspace({
    files: [ifc('substation_ok.ifc'), ifc('substation_faults.ifc')],
    heads: {
      'substation_ok.ifc': SUBSTATION,
      'substation_faults.ifc': SUBSTATION,
    },
  });
  const user = userEvent.setup();
  show();

  await screen.findByText(/2 IFC models/);
  const options = await menuOptions(user);
  expect(options.some((text) => text.startsWith('substation ok'))).toBe(true);
  expect(options.some((text) => text.startsWith('substation faults'))).toBe(
    true,
  );
  expect(options.some((text) => text.includes('SWiM district cooling'))).toBe(
    false,
  );
});

test('the heading names the model once its name arrives, not only if it came first', async () => {
  // A person can choose a model before its name has been read. The heading was
  // bound to the object picked from the menu and kept its file name.
  const library = workspace({
    files: [ifc('Building_1911_AK_v2.ifc')],
    heads: { 'Building_1911_AK_v2.ifc': PAEDAGOGISK },
  });
  library.gate = deferred();
  const user = userEvent.setup();
  show();

  await screen.findByText(/1 IFC model in the shared library/);
  await choose(user, 'Building 1911 AK v2');
  expect(
    screen.getByRole('heading', { name: 'Building 1911 AK v2' }),
  ).toBeTruthy();

  await open(library.gate);

  expect(
    await screen.findByRole('heading', { name: 'Pædagogisk Center' }),
  ).toBeTruthy();
});

test('an empty library says so', async () => {
  workspace({ files: [] });
  show();

  expect(
    await screen.findByText(/No IFC file is in the shared library yet/),
  ).toBeTruthy();
});

test('a listing that comes back as a page says the library could not be listed', async () => {
  // What a workspace served under a different name than the one signed in
  // looks like: the address falls through to the application's own page.
  workspace({ files: [], listing: 'page' });
  show();

  expect(
    await screen.findByText('The shared library could not be listed.'),
  ).toBeTruthy();
  expect(screen.getByText(/returned a web page instead of data/)).toBeTruthy();
});

test('a listing the server refuses names the status', async () => {
  workspace({ files: [], listing: 'error' });
  show();

  expect(
    await screen.findByText('The shared library could not be listed.'),
  ).toBeTruthy();
  expect(screen.getByText(/returned HTTP 500/)).toBeTruthy();
});
