/**
 * Tests for the shortcut table.
 *
 * The table binds the keys, builds the toolbar and writes the help. Most of
 * what can go wrong is a mismatch between those three, so most of these
 * check the table itself instead of any one action.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import {
  SceneView,
  SHORTCUTS,
  handleKey,
  type ShortcutContext,
} from 'src/viewer';

function view(): SceneView {
  const model = new Group();
  const mesh = new Mesh(new BoxGeometry(1, 3, 1), new MeshStandardMaterial());
  mesh.userData.globalId = 'w1';
  mesh.userData.ifcClass = 'IfcWall';
  model.add(mesh);
  model.updateMatrixWorld(true);
  return new SceneView(model, {
    storeys: [{ name: 'L1' }],
    objects: { w1: { ifcClass: 'IfcWall', storey: 'L1' } },
  });
}

function context(scene: SceneView): [ShortcutContext, string[]] {
  const calls: string[] = [];
  return [
    {
      view: scene,
      // No bindings, which is the ordinary case: most models declare no
      // sensors.
      bindings: [],
      refresh: () => calls.push('refresh'),
      frame: () => calls.push('frame'),
      look: (from) => calls.push(`look:${from}`),
      hovered: () => 'w1',
      toggleHelp: () => calls.push('help'),
      toggleFullscreen: () => calls.push('fullscreen'),
    },
    calls,
  ];
}

function press(
  key: string,
  scene: SceneView,
): { handled: boolean; calls: string[] } {
  const [ctx, calls] = context(scene);
  const handled = handleKey(
    { key, target: { tagName: 'BODY' } } as unknown as KeyboardEvent,
    ctx,
  );
  return { handled, calls };
}

test('no two shortcuts share a key', () => {
  const keys = SHORTCUTS.map((entry) => entry.key);

  expect(new Set(keys).size).toBe(keys.length);
});

test('every shortcut has a label, an icon and something to run', () => {
  for (const entry of SHORTCUTS) {
    expect(entry.label).toBeTruthy();
    expect(entry.icon).toBeTruthy();
    expect(typeof entry.run).toBe('function');
  }
});

test('a label reads as a label, not as a sentence', () => {
  for (const entry of SHORTCUTS) {
    expect(entry.label).toMatch(/^[A-Z]/);
    expect(entry.label).not.toMatch(/\.$/);
  }
});

test('a toggle says whether it is on and an action does not', () => {
  const scene = view();
  for (const entry of SHORTCUTS) {
    if (entry.on) expect(typeof entry.on(scene)).toBe('boolean');
  }
  expect(SHORTCUTS.find((e) => e.key === 'f')!.on).toBe(undefined);
});

test('the transparency key turns transparency on and off', () => {
  const scene = view();

  press('t', scene);
  expect(scene.state.transparent).toBe(true);
  press('t', scene);
  expect(scene.state.transparent).toBe(false);
});

test('the heatmap key cycles only through scopes the readings divide', () => {
  // No bindings, so nothing divides by room or storey and only the two
  // that are always offered remain.
  const scene = view();
  const seen: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    press('m', scene);
    seen.push(scene.state.heat);
  }

  expect(seen).toEqual(['building', 'off', 'building']);
});

test('the reset key undoes the toggles and asks for the default view', () => {
  const scene = view();
  scene.state.transparent = true;
  const { calls } = press('r', scene);

  expect(scene.state.transparent).toBe(false);
  expect(calls.includes('look:corner')).toBeTruthy();
});

test('hiding what is under the cursor hides it, and the next key brings it back', () => {
  const scene = view();
  press('q', scene);
  expect(scene.meshes.get('w1')!.visible).toBe(false);

  press('w', scene);
  expect(scene.meshes.get('w1')!.visible).toBe(true);
});

test('an unbound key is left alone', () => {
  expect(press('z', view()).handled).toBe(false);
});

test('a key with a modifier belongs to the browser, not to us', () => {
  const scene = view();
  const [ctx] = context(scene);

  expect(
    handleKey(
      {
        key: 't',
        metaKey: true,
        target: { tagName: 'BODY' },
      } as unknown as KeyboardEvent,
      ctx,
    ),
  ).toBe(false);
  expect(scene.state.transparent).toBe(false);
});

test('typing in a field is typing, not a shortcut', () => {
  // A viewer that swallows the letter t from a search box is a viewer
  // nobody can search in.
  const scene = view();
  const [ctx] = context(scene);

  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
    expect(
      handleKey(
        { key: 't', target: { tagName } } as unknown as KeyboardEvent,
        ctx,
      ),
    ).toBe(false);
  }
  expect(
    handleKey(
      {
        key: 't',
        target: { tagName: 'DIV', isContentEditable: true },
      } as unknown as KeyboardEvent,
      ctx,
    ),
  ).toBe(false);
  expect(scene.state.transparent).toBe(false);
});

test('a key press with no target still works', () => {
  const scene = view();
  const [ctx] = context(scene);

  const handled = handleKey(
    { key: 't', target: null } as unknown as KeyboardEvent,
    ctx,
  );

  expect(handled).toBe(true);
  expect(scene.state.transparent).toBe(true);
});

test('an upper case key press still works', () => {
  const scene = view();
  const [ctx] = context(scene);
  handleKey(
    { key: 'T', target: { tagName: 'BODY' } } as unknown as KeyboardEvent,
    ctx,
  );

  expect(scene.state.transparent).toBe(true);
});
