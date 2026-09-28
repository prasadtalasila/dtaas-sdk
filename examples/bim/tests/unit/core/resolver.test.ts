import {
  resolveBindings,
  topicsOf,
  bindingsByTopic,
  type Binding,
  type Selector,
} from 'src/core';

function binding(selector: Selector, topic?: string): Binding {
  return {
    selector,
    label: 'a sensor',
    source: topic === undefined ? {} : { live: { transport: 'mqtt', topic } },
    display: { unit: '°C', ramp: [4, 16] },
  };
}

const SCENE = [
  { globalId: '0_sgz7bzz4Jh2ckU1ehFe$', nodeName: 'HX-1', expressId: 101 },
  { globalId: '2rhLI2AGjBtf4PwudZJble', nodeName: 'Wall', expressId: 102 },
  { globalId: '1tlDO0c_bCJRLcLkbWZYQN', nodeName: 'Wall', expressId: 103 },
];

test('resolves a binding by GlobalId', () => {
  const { resolved, unresolved } = resolveBindings(
    [binding({ globalId: '0_sgz7bzz4Jh2ckU1ehFe$' })],
    SCENE,
  );

  expect(unresolved.length).toBe(0);
  expect(resolved[0].object.nodeName).toBe('HX-1');
});

test('reports a binding whose object is not in the model, instead of dropping it', () => {
  const { resolved, unresolved } = resolveBindings(
    [binding({ globalId: '0000000000000000000000' })],
    SCENE,
  );

  expect(resolved.length).toBe(0);
  expect(unresolved[0].reason).toMatch(/re-exported/);
});

test('keeps the good bindings when one fails', () => {
  // A single bad binding must not cost the others. This is the ordinary state
  // of a manifest that has drifted from its model.
  const { resolved, unresolved } = resolveBindings(
    [
      binding({ globalId: '0_sgz7bzz4Jh2ckU1ehFe$' }),
      binding({ globalId: '0000000000000000000000' }),
    ],
    SCENE,
  );

  expect(resolved.length).toBe(1);
  expect(unresolved.length).toBe(1);
});

test('refuses a nodeName that two objects share', () => {
  // A name is not an identifier. Picking either would be a guess presented as
  // a fact.
  const { unresolved } = resolveBindings(
    [binding({ nodeName: 'Wall' })],
    SCENE,
  );

  expect(unresolved[0].reason).toMatch(/2 objects are named Wall/);
  expect(unresolved[0].reason).toMatch(/globalId/);
});

test('resolves a nodeName that only one object has', () => {
  const { resolved } = resolveBindings([binding({ nodeName: 'HX-1' })], SCENE);

  expect(resolved[0].object.globalId).toBe('0_sgz7bzz4Jh2ckU1ehFe$');
});

test('says an express id does not survive a re-export', () => {
  const { unresolved } = resolveBindings([binding({ expressId: 999 })], SCENE);

  expect(unresolved[0].reason).toMatch(/does not survive a re-export/);
});

test('resolves an express id that is still in the model', () => {
  const { resolved } = resolveBindings([binding({ expressId: 101 })], SCENE);

  expect(resolved[0].object.globalId).toBe('0_sgz7bzz4Jh2ckU1ehFe$');
});

test('says no object carries a nodeName at all, not just that it is shared', () => {
  const { unresolved } = resolveBindings(
    [binding({ nodeName: 'Nothing-Here' })],
    SCENE,
  );

  expect(unresolved[0].reason).toBe('no object is named Nothing-Here.');
});

test('handles an empty model without throwing', () => {
  const { resolved, unresolved } = resolveBindings(
    [binding({ globalId: '0_sgz7bzz4Jh2ckU1ehFe$' })],
    [],
  );

  expect(resolved.length).toBe(0);
  expect(unresolved.length).toBe(1);
});

test('handles an empty manifest without throwing', () => {
  expect(resolveBindings([], SCENE).resolved.length).toBe(0);
});

test('returns each topic once', () => {
  // Subscribing twice to one topic delivers every message twice.
  const topics = topicsOf([
    binding({ nodeName: 'a' }, 'swim/x'),
    binding({ nodeName: 'b' }, 'swim/x'),
    binding({ nodeName: 'c' }, 'swim/y'),
  ]);

  expect(topics.sort()).toEqual(['swim/x', 'swim/y']);
});

test('leaves a binding with no live source out of the topic list', () => {
  expect(topicsOf([binding({ nodeName: 'a' })])).toEqual([]);
});

test('groups two bindings that share a topic', () => {
  // Two markers can legitimately show the same sensor.
  const index = bindingsByTopic([
    binding({ nodeName: 'a' }, 'swim/x'),
    binding({ nodeName: 'b' }, 'swim/x'),
  ]);

  expect(index.get('swim/x')?.length).toBe(2);
});

test('leaves a binding with no live source out of the topic index', () => {
  expect(bindingsByTopic([binding({ nodeName: 'a' })]).size).toBe(0);
});
