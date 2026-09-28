/**
 * Tests for the building models page once a model is chosen: the files beside
 * it, and the panels and shortcuts that drive the viewer.
 */

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MANIFEST,
  canvas,
  canvasProps,
  choose,
  oneModel,
  respond,
  show,
  viewerReady,
  withSidecars,
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

/** Show the page with one model and choose it. */
async function chooseTheModel() {
  const user = userEvent.setup();
  show();
  await screen.findByText(/1 IFC model/);
  await choose(user, 'Building 1912 AK v4');
  return user;
}

const legend = () =>
  within(screen.getByText('In This Model').parentElement as HTMLElement);

test('the property tree and the manifest beside a model reach the canvas', async () => {
  withSidecars(MANIFEST);
  await chooseTheModel();

  await act(async () => {});
  expect(canvasProps().tree?.objects).toEqual({ w1: { ifcClass: 'IfcWall' } });
  expect(canvasProps().bindings?.map((b) => b.label)).toEqual([
    'Wall temperature',
  ]);
});

test('a manifest that cannot be read says so', async () => {
  withSidecars('page');
  await chooseTheModel();

  expect(
    await screen.findByText('The sensor manifest could not be read.'),
  ).toBeTruthy();
});

test('once the viewer is ready, the legend lists the classes and their counts', async () => {
  oneModel();
  await chooseTheModel();
  await viewerReady();

  const rows = legend()
    .getAllByRole('button')
    .map((row) => row.textContent);
  expect(rows.sort()).toEqual(['Slab2', 'Wall2']);
});

test('picking a class in the legend lights it, and picking it again clears it', async () => {
  oneModel();
  const user = await chooseTheModel();
  const { view } = await viewerReady();

  await user.click(legend().getByRole('button', { name: /Wall/ }));
  expect(view.state.highlightedClass).toBe('IfcWall');

  await user.click(legend().getByRole('button', { name: /Wall/ }));
  expect(view.state.highlightedClass).toBeNull();
});

test('a keyboard shortcut reaches the viewer', async () => {
  oneModel();
  const user = await chooseTheModel();
  const { looked } = await viewerReady();

  // 1 is Look From Above in the shortcut table.
  await user.keyboard('1');
  expect(looked).toEqual(['top']);
});

test('a viewer left alone is painted once, not over and over', async () => {
  // A host that passes no readings used to get a new empty map on every
  // render. The effect that applies readings depends on it and repaints, which
  // rendered again, so the page repainted the model without end.
  oneModel();
  await chooseTheModel();
  const { painted } = await viewerReady();
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });

  expect(painted.count).toBe(1);
});

test('a property tree that cannot be read leaves the model drawing without it', async () => {
  withSidecars(MANIFEST);
  // The tree comes back as a page. It is not worth stopping the page for, so
  // the model draws and says less about each object.
  const original = globalThis.fetch;
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith('Building_1912_AK_v4.json')) {
      return respond('<!doctype html>', { type: 'text/html' });
    }
    return original(url, init);
  };
  await chooseTheModel();
  await act(async () => {});

  expect(screen.getByTestId('canvas')).toBeTruthy();
  expect(canvasProps().tree).toBeUndefined();
  expect(screen.queryByText(/could not be listed/)).toBeNull();
});

test('choosing a floor shows that floor', async () => {
  oneModel();
  const user = await chooseTheModel();
  const { view } = await viewerReady();

  await user.click(screen.getByRole('combobox', { name: /^Floor/ }));
  await user.click(await screen.findByRole('option', { name: 'L2' }));

  expect(view.state.storey).toBe('L2');
});

test('the floor picker sits on the toolbar row, right after its last button', async () => {
  // One line of controls above the drawing. jsdom has no layout, so this
  // checks the structure that produces it: the toolbar and the floor picker
  // are siblings in one wrapping row, with the picker after the toolbar.
  oneModel();
  await chooseTheModel();
  await viewerReady();

  const toolbar = document.querySelector('[data-revision]') as HTMLElement;
  const floor = screen.getByRole('combobox', { name: /^Floor/ });
  expect(toolbar.nextElementSibling?.contains(floor)).toBe(true);
  expect(getComputedStyle(toolbar.parentElement as HTMLElement).flexWrap).toBe(
    'wrap',
  );
});

test('the shortcuts that repaint, frame and open the help reach the page', async () => {
  oneModel();
  const user = await chooseTheModel();
  const { painted } = await viewerReady();

  // t repaints, so the field is drawn again along with the model.
  await user.keyboard('t');
  expect(painted.count).toBe(2);
  // Fullscreen is absent in jsdom, which must not throw.
  await user.keyboard('af');

  await user.keyboard('?');
  expect(await screen.findByRole('dialog', { name: 'Shortcuts' })).toBeTruthy();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('a heatmap with no reading yet says so beside the drawing', async () => {
  withSidecars(MANIFEST);
  const user = await chooseTheModel();
  await act(async () => {});
  await viewerReady();

  await user.keyboard('m');

  expect(screen.getByText('No current reading to colour by.')).toBeTruthy();
});

test('a closed note stays closed', async () => {
  oneModel();
  const user = await chooseTheModel();
  const note = screen.getByText(/No converted geometry sits beside/);

  await user.click(
    within(note.closest('[role="alert"]') as HTMLElement).getByRole('button', {
      name: 'Close',
    }),
  );

  expect(screen.queryByText(/No converted geometry sits beside/)).toBeNull();
});
