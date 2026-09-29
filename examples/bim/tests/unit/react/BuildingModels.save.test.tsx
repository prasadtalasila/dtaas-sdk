/**
 * Tests for storing a conversion made in the browser: what the page says while
 * it happens and after, and what it asks of the canvas.
 */

import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DIRECTORY,
  TEMPLATE,
  canvas,
  canvasProps,
  choose,
  deferred,
  ifc,
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

const GLB = {
  name: 'Building_1912_AK_v4.glb',
  path: `${DIRECTORY}/Building_1912_AK_v4.glb`,
  size: 3,
};

beforeEach(() => {
  canvas.props = null;
  canvas.mounts = 0;
});

test('a model with no geometry says it is read from the IFC file', async () => {
  oneModel();
  const user = userEvent.setup();
  show({ onPersistGeometry: async () => {} });

  await screen.findByText(/1 IFC model/);
  const drawn = await choose(user, 'Building 1912 AK v4');

  expect(drawn.dataset.convert).toBe('true');
  expect(
    screen.getByText(/No converted geometry sits beside this model/),
  ).toBeTruthy();
});

test('a stored conversion is said while it happens and after it lands', async () => {
  const library = oneModel();
  const store = deferred();
  const stored: Array<{ model: string; bytes: number }> = [];
  const user = userEvent.setup();
  show({
    onPersistGeometry: (model, glb) => {
      stored.push({ model: model.ifcPath, bytes: glb.length });
      return store.promise;
    },
  });

  await screen.findByText(/1 IFC model/);
  await choose(user, 'Building 1912 AK v4');

  await act(async () => {
    canvasProps().onConverted?.(new Uint8Array([1, 2, 3]));
  });
  expect(stored).toEqual([
    { model: `${DIRECTORY}/Building_1912_AK_v4.ifc`, bytes: 3 },
  ]);
  expect(screen.getByText(/Saving the conversion to the library/)).toBeTruthy();

  // The file the host wrote, which the page finds when it reads the directory
  // again.
  library.files.push(GLB);
  await open(store);

  expect(await screen.findByText(/Stored in the library/)).toBeTruthy();
  expect(screen.queryByText(/Saving the conversion/)).toBeNull();
});

test('after a save the model reads as converted, and the drawing is not redrawn', async () => {
  const library = oneModel();
  const user = userEvent.setup();
  show({ onPersistGeometry: async () => {} });

  await screen.findByText(/1 IFC model/);
  await choose(user, 'Building 1912 AK v4');
  const heading = screen.getByRole('heading', { name: 'Building 1912 AK v4' });
  const row = within(heading.parentElement as HTMLElement);
  expect(row.getByText('From IFC')).toBeTruthy();

  library.files.push(GLB);
  await act(async () => {
    canvasProps().onConverted?.(new Uint8Array([1, 2, 3]));
  });

  // The chip beside the name follows the listing, and so does the notice.
  expect(await row.findByText('Converted')).toBeTruthy();
  expect(
    screen.queryByText(/No converted geometry sits beside this model/),
  ).toBeNull();
  // The model already on screen stays: redrawing it from the new file would
  // throw away a drawing that is correct.
  expect(canvas.mounts).toBe(1);
});

test('a refused store is said, and nothing breaks', async () => {
  oneModel();
  const user = userEvent.setup();
  show({
    onPersistGeometry: async () => {
      throw new Error('HTTP 403');
    },
  });

  await screen.findByText(/1 IFC model/);
  await choose(user, 'Building 1912 AK v4');
  await act(async () => {
    canvasProps().onConverted?.(new Uint8Array([1]));
  });

  expect(
    await screen.findByText(
      /could not be stored, so this model will convert again/,
    ),
  ).toBeTruthy();
  expect(screen.getByTestId('canvas')).toBeTruthy();
});

test('choosing another model clears the message about the last one', async () => {
  workspace({
    files: [ifc('Building_1912_AK_v4.ifc'), ifc('Building_Deli_AK_v1.ifc')],
    heads: {
      'Building_1912_AK_v4.ifc': TEMPLATE,
      'Building_Deli_AK_v1.ifc': TEMPLATE,
    },
  });
  const user = userEvent.setup();
  show({
    onPersistGeometry: async () => {
      throw new Error('refused');
    },
  });

  await screen.findByText(/2 IFC models/);
  await choose(user, 'Building 1912 AK v4');
  await act(async () => {
    canvasProps().onConverted?.(new Uint8Array([1]));
  });
  expect(await screen.findByText(/could not be stored/)).toBeTruthy();

  await choose(user, 'Building Deli AK v1');
  expect(screen.queryByText(/could not be stored/)).toBeNull();

  // Choosing the first model back starts it afresh, as choosing always has.
  await choose(user, 'Building 1912 AK v4');
  expect(screen.queryByText(/could not be stored/)).toBeNull();
});

test('without a way to store, the canvas is never asked for the bytes', async () => {
  oneModel();
  const user = userEvent.setup();
  show();

  await screen.findByText(/1 IFC model/);
  await choose(user, 'Building 1912 AK v4');

  expect(canvasProps().onConverted).toBeUndefined();
});

test('an earlier save that settles late does not overwrite a later one', async () => {
  oneModel();
  const first = deferred();
  const second = deferred();
  const pending = [first, second];
  const user = userEvent.setup();
  show({ onPersistGeometry: () => (pending.shift() ?? first).promise });

  await screen.findByText(/1 IFC model/);
  await choose(user, 'Building 1912 AK v4');
  await act(async () => {
    canvasProps().onConverted?.(new Uint8Array([1]));
    canvasProps().onConverted?.(new Uint8Array([2]));
  });
  await open(second);
  expect(await screen.findByText(/Stored in the library/)).toBeTruthy();

  await act(async () => {
    first.reject(new Error('refused'));
    await first.promise.catch(() => {});
  });

  expect(screen.queryByText(/could not be stored/)).toBeNull();
  expect(screen.getByText(/Stored in the library/)).toBeTruthy();
});
