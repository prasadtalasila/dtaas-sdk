/**
 * Tests for the canvas around the renderer: what it reports once a model is
 * in the scene, what it shows while loading or after a failure, and what it
 * gives back on unmount.
 *
 * jsdom has no WebGL, so the renderer is replaced, and so is the loader: each
 * test decides what the geometry turns out to be.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import BimCanvas, { type BimCanvasProps } from 'src/react/BimCanvas';
import type { Binding } from 'src/core';
import { loadGeometry, type GeometryLoad } from 'src/react/loadGeometry';

const mockDispose = jest.fn();
jest.mock('src/react/canvasRenderer', () => ({
  startRenderer: () => ({
    controls: {
      target: new (jest.requireActual('three').Vector3)(),
      update: () => {},
    },
    dispose: mockDispose,
  }),
}));
jest.mock('src/react/loadGeometry', () => ({ loadGeometry: jest.fn() }));

/** One wall, one metre by three. */
function wall(): Group {
  const model = new Group();
  const mesh = new Mesh(new BoxGeometry(1, 3, 1), new MeshStandardMaterial());
  mesh.userData.globalId = 'w1';
  mesh.userData.ifcClass = 'IfcWall';
  model.add(mesh);
  return model;
}

const sensor = (globalId: string): Binding => ({
  selector: { globalId },
  label: `Sensor on ${globalId}`,
  source: { live: { transport: 'mqtt', topic: `t/${globalId}` } },
  display: { unit: '°C', ramp: [4, 16] },
});

/** Mount the canvas, holding the load open so each test settles it. */
function mount(props: Partial<BimCanvasProps> = {}) {
  let load: GeometryLoad | undefined;
  jest.mocked(loadGeometry).mockImplementation(async (given) => {
    load = given;
  });
  const handlers = {
    onReport: jest.fn(),
    onReady: jest.fn(),
    onSelect: jest.fn(),
  };
  const view = render(
    <BimCanvas url="http://host/a.glb" {...handlers} {...props} />,
  );
  const current = () => {
    if (!load) throw new Error('nothing was loaded');
    return load;
  };
  return { ...view, ...handlers, load: current };
}

test('a loaded model is handed over, and its sensors are counted', async () => {
  const { load, onReady, onReport } = mount({ bindings: [sensor('w1')] });

  await act(async () => load().onLoaded(wall()));

  expect(onReady).toHaveBeenCalledTimes(1);
  expect([...onReady.mock.calls[0][0].view.meshes.keys()]).toEqual(['w1']);
  expect(onReport).toHaveBeenCalledWith('1 sensor placed on the model.');
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('a conversion note comes first, and sensors the geometry lacks are named', async () => {
  const bindings = [sensor('w1'), sensor('gone')];
  const { load, onReport } = mount({ bindings, proposed: true });

  await act(async () => load().onLoaded(wall(), 'Converted in the browser.'));

  expect(onReport).toHaveBeenCalledWith(
    'Converted in the browser. 1 of 2 proposed sensors placed. ' +
      '1 name an object this geometry does not have.',
  );
});

test('a model with no sensors and no note reports nothing', async () => {
  const { load, onReport } = mount();

  await act(async () => load().onLoaded(wall()));

  expect(onReport).not.toHaveBeenCalled();
});

test('progress is shown while the model loads', async () => {
  const { load } = mount({ convert: true });

  await act(async () => load().onProgress('Converting, 250 objects'));

  expect(screen.getByRole('progressbar')).toBeTruthy();
  expect(screen.getByText('Converting, 250 objects')).toBeTruthy();
  expect(load().convert).toBe(true);
});

test('a failure is said over the canvas', async () => {
  const { load } = mount();

  await act(async () => load().onFailed('The geometry could not be read.'));

  expect(screen.getByRole('alert').textContent).toBe(
    'The geometry could not be read.',
  );
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('the handle moves the camera and draws the field', async () => {
  const { load, onReady } = mount();
  await act(async () => load().onLoaded(wall()));
  const handle = onReady.mock.calls[0][0];

  expect(() => {
    handle.frame();
    handle.look('top');
    handle.drawField();
  }).not.toThrow();
});

test('the pointer picks the object under it, at the centre of the view', async () => {
  const onHover = jest.fn();
  const { load, onReady, onSelect } = mount({ onHover });
  await act(async () => load().onLoaded(wall()));
  const holder = screen.getByTestId('bim-canvas');
  holder.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  const centre = { clientX: 50, clientY: 50 };

  fireEvent.pointerMove(holder, centre);
  fireEvent.pointerMove(holder, centre);
  fireEvent.click(holder, centre);

  expect(onHover.mock.calls).toEqual([['w1']]);
  expect(onSelect).toHaveBeenCalledWith('w1');
  expect(onReady.mock.calls[0][0].view.state.selected).toBe('w1');
});

test('unmounting gives the renderer back and ignores a late model', async () => {
  const { load, onReady, unmount } = mount();
  unmount();

  await act(async () => load().onLoaded(wall()));
  load().onFailed('late');

  expect(mockDispose).toHaveBeenCalledTimes(1);
  expect(onReady).not.toHaveBeenCalled();
  expect(load().running()).toBe(false);
});
