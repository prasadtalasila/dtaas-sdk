/**
 * Tests for what the host controls: which model is shown, which folder is
 * listed and how, and the bindings of the model on screen.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LibraryEntry } from 'src/react/assets';
import {
  DIRECTORY,
  MANIFEST,
  canvas,
  choose,
  deferred,
  ifc,
  menuOptions,
  page,
  show,
  workspace,
} from 'tests/unit/react/buildingModels.support';

jest.mock('src/react/BimCanvas', () => ({
  __esModule: true,
  default: jest.requireActual('tests/unit/react/buildingModels.support')
    .StandInCanvas,
}));

/** Two models whose file names give their titles, hospital-a sorting first. */
function twoModels() {
  return workspace({ files: [ifc('office-b.ifc'), ifc('hospital-a.ifc')] });
}

const drawnUrl = async () =>
  (await screen.findByTestId('canvas')).dataset.url ?? '';

/** An entry in a named folder, for the tests that change folder. */
const entryIn = (folder: string, name: string): LibraryEntry => ({
  name,
  path: `${folder}/${name}`,
});

beforeEach(() => {
  canvas.props = null;
  canvas.mounts = 0;
});

test('a selected model is shown, and a new selection switches the canvas', async () => {
  twoModels();
  const { rerender } = show({ selected: 'office-b' });

  expect(await drawnUrl()).toMatch(/office-b\.ifc$/);
  expect(screen.getByRole('heading', { name: 'office-b' })).toBeTruthy();

  rerender(page({ selected: 'hospital-a' }));
  await waitFor(async () =>
    expect(await drawnUrl()).toMatch(/hospital-a\.ifc$/),
  );
});

test('picking a model asks the host, and a controlled page waits for the prop', async () => {
  twoModels();
  const onSelect = jest.fn();
  const user = userEvent.setup();
  const { rerender } = show({ selected: 'hospital-a', onSelect });
  await screen.findByText(/2 IFC models/);

  await choose(user, 'office-b');
  expect(onSelect).toHaveBeenCalledWith('office-b');
  expect(await drawnUrl()).toMatch(/hospital-a\.ifc$/);

  rerender(page({ selected: 'office-b', onSelect }));
  await waitFor(async () => expect(await drawnUrl()).toMatch(/office-b\.ifc$/));
});

test('an uncontrolled page tells the host and switches on its own', async () => {
  twoModels();
  const onSelect = jest.fn();
  const user = userEvent.setup();
  show({ onSelect });
  await screen.findByText(/2 IFC models/);

  const drawn = await choose(user, 'office-b');
  expect(onSelect).toHaveBeenCalledWith('office-b');
  expect(drawn.dataset.url).toMatch(/office-b\.ifc$/);
});

test('a selected model the folder does not hold is named', async () => {
  twoModels();
  show({ selected: 'gone' });

  expect(
    await screen.findByText(`No model named gone in ${DIRECTORY}`),
  ).toBeTruthy();
  expect(screen.queryByTestId('canvas')).toBeNull();
});

test('the host hears the bindings of the model on screen', async () => {
  workspace({
    files: [
      ifc('office-b.ifc'),
      ifc('hospital-a.ifc'),
      {
        name: 'office-b.manifest.json',
        path: `${DIRECTORY}/office-b.manifest.json`,
      },
    ],
    json: { 'office-b.manifest.json': MANIFEST },
  });
  const onBindingsChange = jest.fn();
  const { rerender } = show({ selected: 'office-b', onBindingsChange });

  await waitFor(() =>
    expect(onBindingsChange).toHaveBeenLastCalledWith(MANIFEST.bindings),
  );

  rerender(page({ selected: 'hospital-a', onBindingsChange }));
  await waitFor(() => expect(onBindingsChange).toHaveBeenLastCalledWith([]));
});

test('a host that lists the folder itself is asked, and nothing is fetched to list it', async () => {
  workspace();
  const list = jest.fn(async () => [ifc('hospital-a.ifc')]);
  const user = userEvent.setup();
  show({ list });
  await screen.findByText(/1 IFC model/);

  expect(await menuOptions(user)).toEqual([
    expect.stringMatching(/^hospital-a/),
  ]);
  expect(list).toHaveBeenCalledWith(DIRECTORY);
  const requested = (globalThis.fetch as jest.Mock).mock.calls.map(([url]) =>
    String(url),
  );
  expect(requested.some((url) => url.includes('/api/contents/'))).toBe(false);
});

test('a folder left behind while its listing is in flight never shows its models', async () => {
  workspace();
  const listings = {
    a: deferred<LibraryEntry[]>(),
    b: deferred<LibraryEntry[]>(),
  };
  const list = jest.fn(
    (folder: string) => listings[folder as 'a' | 'b'].promise,
  );
  const user = userEvent.setup();
  const { rerender } = render(page({ directory: 'a', list }));

  rerender(page({ directory: 'b', list }));
  await act(async () => listings.b.resolve([entryIn('b', 'office-b.ifc')]));
  await act(async () =>
    listings.a.resolve([
      entryIn('a', 'hospital-a.ifc'),
      entryIn('a', 'clinic-c.ifc'),
    ]),
  );

  expect(screen.getByText(/1 IFC model in the shared library/)).toBeTruthy();
  expect(await menuOptions(user)).toEqual([expect.stringMatching(/^office-b/)]);
});

test('a folder being listed does not show the last folder meanwhile', async () => {
  workspace();
  const later = deferred<LibraryEntry[]>();
  const list = jest.fn(async (folder: string) =>
    folder === 'a' ? [entryIn('a', 'hospital-a.ifc')] : later.promise,
  );
  const { rerender } = render(page({ directory: 'a', list }));
  expect(await screen.findByText(/1 IFC model/)).toBeTruthy();

  rerender(page({ directory: 'b', list }));

  expect(screen.queryByRole('combobox')).toBeNull();
  await act(async () => later.resolve([]));
  expect(
    screen.getByText(/No IFC file is in the shared library yet/),
  ).toBeTruthy();
});
