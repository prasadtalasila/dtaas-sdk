/**
 * Tests for where the axes indicator is drawn.
 *
 * Only the pure half is tested: the placement of the square. Drawing needs
 * a graphics context, and a test that mocks a WebGL renderer proves the
 * mock works instead of that the gizmo does.
 */

import { cornerViewport, GIZMO_SIZE_PX, GIZMO_MARGIN_PX } from 'src/viewer';

describe('cornerViewport', () => {
  test('sits in the bottom left, inside the margin', () => {
    const { x, y, side } = cornerViewport(800, 600);

    expect(x).toBe(GIZMO_MARGIN_PX);
    expect(y).toBe(GIZMO_MARGIN_PX);
    expect(side).toBe(GIZMO_SIZE_PX);
  });

  test('shrinks instead of hanging off a narrow view', () => {
    // A panel narrower than the gizmo is a real case, and a square drawn
    // past the edge reads as a rendering fault.
    expect(cornerViewport(60, 600).side).toBe(60 - 2 * GIZMO_MARGIN_PX);
  });

  test('shrinks for a short view too', () => {
    expect(cornerViewport(800, 50).side).toBe(50 - 2 * GIZMO_MARGIN_PX);
  });

  test('gives nothing to draw when the view is smaller than the margins', () => {
    // Asked for a negative side, WebGL raises instead of drawing nothing.
    expect(cornerViewport(10, 10).side).toBe(0);
    expect(cornerViewport(0, 0).side).toBe(0);
  });

  test('never lets the square cross the far edge', () => {
    for (const [width, height] of [
      [800, 600],
      [200, 200],
      [40, 300],
      [300, 40],
    ]) {
      const { x, y, side } = cornerViewport(width, height);

      expect(x + side <= width).toBeTruthy();
      expect(y + side <= height).toBeTruthy();
    }
  });
});
