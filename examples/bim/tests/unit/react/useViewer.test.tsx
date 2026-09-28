/**
 * Direct tests for the parts of `useViewer` the full `BuildingModels` render
 * never reaches: the shortcut context called before a canvas has reported
 * ready, and the two fullscreen branches, which jsdom otherwise leaves on one
 * side (`requestFullscreen` absent, `fullscreenElement` always null).
 */

import { renderHook } from '@testing-library/react';
import useViewer from 'src/react/useViewer';
import type { SceneView } from 'src/viewer';

function freshViewer() {
  const { result } = renderHook(() =>
    useViewer(null, { bindings: [], readings: new Map(), feed: 'live' }),
  );
  const view = { refresh: jest.fn() } as unknown as SceneView;
  return result.current.shortcutContext(view);
}

afterEach(() => {
  Object.defineProperty(document, 'fullscreenElement', {
    value: null,
    configurable: true,
  });
  delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  delete (document.documentElement as { requestFullscreen?: unknown })
    .requestFullscreen;
});

test('refresh, frame and look tolerate being called before a canvas is ready', () => {
  const context = freshViewer();

  expect(() => {
    context.refresh();
    context.frame();
    context.look('top');
  }).not.toThrow();
});

test('the fullscreen shortcut exits fullscreen when the document is already in it', () => {
  Object.defineProperty(document, 'fullscreenElement', {
    value: document.body,
    configurable: true,
  });
  const exit = jest.fn().mockResolvedValue(undefined);
  document.exitFullscreen = exit as typeof document.exitFullscreen;

  freshViewer().toggleFullscreen();

  expect(exit).toHaveBeenCalledTimes(1);
});

test('the fullscreen shortcut requests it when a real implementation exists', () => {
  const request = jest.fn().mockRejectedValue(new Error('denied'));
  document.documentElement.requestFullscreen =
    request as typeof document.documentElement.requestFullscreen;

  freshViewer().toggleFullscreen();

  expect(request).toHaveBeenCalledTimes(1);
});
