/**
 * Smoke tests for the panels: each renders its headline and answers one
 * interaction, taken from its own prop type.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneView, SHORTCUTS, type ShortcutContext } from 'src/viewer';
import { FloorPicker } from 'src/react/FloorPicker';
import { Toolbar } from 'src/react/Toolbar';
import { ObjectPanel } from 'src/react/ObjectPanel';
import { HelpPanel } from 'src/react/HelpPanel';
import { ClassLegend, HeatLegend } from 'src/react/Legend';

/** A view with one wall, coloured by the palette, for the legend and toolbar tests. */
function wallView(): SceneView {
  const model = new Group();
  const mesh = new Mesh(new BoxGeometry(1, 3, 1), new MeshStandardMaterial());
  mesh.userData.globalId = 'w1';
  mesh.userData.ifcClass = 'IfcWall';
  model.add(mesh);
  model.updateMatrixWorld(true);
  return new SceneView(model);
}

function shortcutContext(view: SceneView): ShortcutContext {
  return {
    view,
    bindings: [],
    refresh: jest.fn(),
    frame: jest.fn(),
    look: jest.fn(),
    hovered: () => null,
    toggleHelp: jest.fn(),
    toggleFullscreen: jest.fn(),
  };
}

test('FloorPicker shows the floors and steps up on the up arrow', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  render(
    <FloorPicker storeys={['L1', 'L2']} current={null} onChange={onChange} />,
  );

  expect(screen.getByLabelText('Floor')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'The floor above' }));
  expect(onChange).toHaveBeenCalledWith('L1');
});

test('FloorPicker draws nothing for a model with no storeys', () => {
  const { container } = render(
    <FloorPicker storeys={[]} current={null} onChange={jest.fn()} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test('FloorPicker steps down from All Floors to the highest floor', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  render(
    <FloorPicker storeys={['L1', 'L2']} current={null} onChange={onChange} />,
  );

  await user.click(screen.getByRole('button', { name: 'The floor below' }));
  expect(onChange).toHaveBeenCalledWith('L2');
});

test('FloorPicker returns to All Floors when it is chosen from the menu', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  render(
    <FloorPicker storeys={['L1', 'L2']} current="L1" onChange={onChange} />,
  );

  await user.click(screen.getByRole('combobox', { name: 'Floor' }));
  await user.click(await screen.findByRole('option', { name: 'All Floors' }));
  expect(onChange).toHaveBeenCalledWith(null);
});

test('Toolbar shows the shortcut buttons and runs one on click', async () => {
  const user = userEvent.setup();
  const view = wallView();
  const context = shortcutContext(view);

  render(<Toolbar view={view} context={context} revision={0} />);

  expect(screen.getByLabelText('Transparency')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Transparency'));
  expect(view.state.transparent).toBe(true);
  expect(context.refresh).toHaveBeenCalledTimes(1);
});

test('ObjectPanel shows the facts and opens the property sets', async () => {
  const user = userEvent.setup();
  render(
    <ObjectPanel
      globalId="w1"
      facts={{ name: 'Wall 1', ifcClass: 'IfcWall' }}
      binding={undefined}
      properties={{ Pset_WallCommon: { IsExternal: true } }}
      size={{ x: 1, y: 2, z: 0.2 }}
    />,
  );

  expect(screen.getByText('Wall 1')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Properties' }));
  expect(screen.getByText('Pset_WallCommon')).toBeInTheDocument();
});

test('HelpPanel lists the shortcuts and closes on escape', async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  render(<HelpPanel open onClose={onClose} />);

  expect(
    screen.getByRole('heading', { name: 'Shortcuts' }),
  ).toBeInTheDocument();
  expect(screen.getByText(SHORTCUTS[0].label)).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('ClassLegend shows the classes present and picks one on click', async () => {
  const user = userEvent.setup();
  const view = wallView();
  const onChange = jest.fn();
  render(<ClassLegend view={view} onChange={onChange} />);

  expect(screen.getByText('In This Model')).toBeInTheDocument();
  await user.click(screen.getByText('Wall'));
  expect(view.state.highlightedClass).toBe('IfcWall');
  expect(onChange).toHaveBeenCalledTimes(1);
});

test('HeatLegend states the range when there is a reading, and says there is none otherwise', () => {
  const { rerender } = render(
    <HeatLegend
      zones={{ meanByZone: new Map(), low: 10, high: 30, counted: 2 }}
      unit="°C"
      coloured={5}
    />,
  );
  expect(screen.getByText('Heatmap')).toBeInTheDocument();
  expect(screen.getByText('2 sensors, 5 objects')).toBeInTheDocument();

  rerender(<HeatLegend zones={null} unit="°C" coloured={0} />);
  expect(
    screen.getByText('No current reading to colour by.'),
  ).toBeInTheDocument();
});
