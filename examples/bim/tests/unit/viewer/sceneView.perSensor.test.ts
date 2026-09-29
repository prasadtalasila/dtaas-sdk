/**
 * Tests for the Per Sensor heat scope: each sensor owns the part of the floor
 * nearest to it, and only the sensors on the floor being looked at count.
 */

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { SceneView } from 'src/viewer';
import { binding } from 'tests/fixtures/readings';
import { fieldSourcesOf } from './sceneView.fixtures';

describe('the Per Sensor scope', () => {
  /** Two walls three metres apart, with a sensor beside each. */
  function twoZones(): SceneView {
    const model = new Group();
    for (const [id, x] of [
      ['s1', -3],
      ['s2', 3],
    ] as const) {
      const mesh = new Mesh(
        new BoxGeometry(0.1, 0.1, 0.1),
        new MeshStandardMaterial(),
      );
      mesh.position.set(x, 1.2, 0);
      mesh.userData.globalId = id;
      mesh.userData.ifcClass = 'IfcSensor';
      model.add(mesh);
    }
    const floor = new Mesh(
      new BoxGeometry(12, 0.2, 6),
      new MeshStandardMaterial(),
    );
    floor.position.set(0, -0.1, 0);
    floor.userData.globalId = 'floor';
    floor.userData.ifcClass = 'IfcSlab';
    model.add(floor);
    model.updateMatrixWorld(true);
    return new SceneView(model, { objects: { s1: {}, s2: {}, floor: {} } });
  }

  const bind = (globalId: string) => binding(globalId, [0, 40], 'C');

  test('each sensor is its own zone', () => {
    const view = twoZones();
    view.state.heat = 'sensor';
    view.buildField([bind('s1'), bind('s2')]);

    expect(view.zoneFor('s1')).toBe('s1');
    expect(view.zoneFor('s2')).toBe('s2');
  });

  test('an object between them takes the nearer one', () => {
    // Nothing blocks here, so nearest by walking is nearest by line, which
    // is what makes this the check that the plumbing is connected at all.
    const view = twoZones();
    view.state.heat = 'sensor';
    view.buildField([bind('s1'), bind('s2')]);

    expect(view.zoneFor('floor')).toBe('s1');
  });

  test('it is offered when there is more than one sensor and not before', () => {
    const view = twoZones();

    expect(
      view.scopesFor([bind('s1'), bind('s2')]).includes('sensor'),
    ).toBeTruthy();
    expect(view.scopesFor([bind('s1')]).includes('sensor')).toBe(false);
  });
});

describe('the Per Sensor scope across floors', () => {
  /**
   * Two floors, one sensor each, on opposite sides of the plan.
   *
   * The sensors are placed so that the wrong answer is visible: the probe
   * on the upper floor sits directly above the lower floor's sensor, so a
   * field that still holds both sources hands it the sensor downstairs.
   */
  function twoFloors(): SceneView {
    const model = new Group();
    const add = (
      globalId: string,
      ifcClass: string,
      x: number,
      y: number,
      size: [number, number, number],
    ) => {
      const mesh = new Mesh(
        new BoxGeometry(...size),
        new MeshStandardMaterial(),
      );
      mesh.position.set(x, y, 0);
      mesh.userData.globalId = globalId;
      mesh.userData.ifcClass = ifcClass;
      model.add(mesh);
    };
    add('slab1', 'IfcSlab', 0, 0.1, [12, 0.2, 6]);
    add('slab2', 'IfcSlab', 0, 3.1, [12, 0.2, 6]);
    add('s1', 'IfcSensor', -4, 1.2, [0.1, 0.1, 0.1]);
    add('s2', 'IfcSensor', 4, 4.2, [0.1, 0.1, 0.1]);
    add('p2', 'IfcFurniture', -4, 4.2, [0.4, 0.4, 0.4]);
    model.updateMatrixWorld(true);

    return new SceneView(model, {
      storeys: [{ name: 'L1' }, { name: 'L2' }],
      objects: {
        slab1: { ifcClass: 'IfcSlab', storey: 'L1' },
        s1: { ifcClass: 'IfcSensor', storey: 'L1' },
        slab2: { ifcClass: 'IfcSlab', storey: 'L2' },
        s2: { ifcClass: 'IfcSensor', storey: 'L2' },
        p2: { ifcClass: 'IfcFurniture', storey: 'L2' },
      },
    });
  }

  const bind = (globalId: string) => binding(globalId, [0, 40], 'C');

  test('changing floor rebuilds the field instead of reusing the first one', () => {
    // The field used to be keyed on the bindings alone, so the first floor
    // looked at was the only floor the heatmap ever described.
    const view = twoFloors();
    view.state.heat = 'sensor';

    view.state.storey = 'L1';
    view.buildField([bind('s1'), bind('s2')]);
    const onFirst = [...fieldSourcesOf(view)];

    view.state.storey = 'L2';
    view.buildField([bind('s1'), bind('s2')]);

    expect(onFirst).toEqual(['s1']);
    expect(fieldSourcesOf(view)).toEqual(['s2']);
  });

  test('a sensor downstairs does not heat the floor above it', () => {
    const view = twoFloors();
    view.state.heat = 'sensor';
    view.state.storey = 'L2';
    view.buildField([bind('s1'), bind('s2')]);

    expect(view.zoneFor('p2')).toBe('s2');
  });

  test('with no floor chosen every sensor is a source, since all of them are drawn', () => {
    const view = twoFloors();
    view.state.heat = 'sensor';
    view.buildField([bind('s1'), bind('s2')]);

    expect(fieldSourcesOf(view)).toEqual(['s1', 's2']);
  });
});
