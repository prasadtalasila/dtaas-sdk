/**
 * Direct tests for the panels below the drawing: an object actually picked,
 * which the `BuildingModels` tests never trigger because jsdom has no real
 * raycasting, and a heatmap with no bindings to state a unit for.
 */

import { render, screen } from '@testing-library/react';
import { ViewerPanels, type Live } from 'src/react/ViewerPanels';
import type { Viewer } from 'src/react/useViewer';
import { building } from 'tests/unit/react/buildingModels.fixtures';

function viewerStub(picked: string | null): Viewer {
  return {
    handle: null,
    revision: 0,
    bump: jest.fn(),
    picked,
    pick: jest.fn(),
    helpOpen: false,
    closeHelp: jest.fn(),
    shortcutContext: jest.fn(),
    onReady: jest.fn(),
    onHover: jest.fn(),
  };
}

const NO_LIVE: Live = { bindings: [], readings: new Map(), feed: 'live' };

test('the object picked in the drawing shows its facts and its size', () => {
  const view = building();
  render(<ViewerPanels view={view} viewer={viewerStub('w1')} live={NO_LIVE} />);

  expect(screen.getByText('IfcWall')).toBeInTheDocument();
});

test('a heatmap on with no bindings still renders, with no unit to state', () => {
  const view = building();
  view.state.heat = 'storey';
  render(<ViewerPanels view={view} viewer={viewerStub(null)} live={NO_LIVE} />);

  expect(screen.getByText('Heatmap')).toBeInTheDocument();
});
