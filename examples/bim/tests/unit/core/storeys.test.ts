import {
  bandsFrom,
  bandOf,
  MERGE_WITHIN_M,
  FLOOR_MARGIN_M,
  type Band,
  type ObjectBase,
} from 'src/core';

/** Objects sitting flat on one floor. */
function floor(storey: string, base: number, count = 8): ObjectBase[] {
  return Array.from({ length: count }, () => ({ storey, base }));
}

test('one band per storey, lowest first', () => {
  const bands = bandsFrom(
    ['L1', 'L2', 'L3'],
    [...floor('L1', 0), ...floor('L2', 3.2), ...floor('L3', 6.4)],
  );

  expect(bands.length).toBe(3);
  expect(bands.map((b: Band) => b.names)).toEqual([['L1'], ['L2'], ['L3']]);
});

test('a band reaches the floor above it', () => {
  const bands = bandsFrom(
    ['L1', 'L2'],
    [...floor('L1', 0), ...floor('L2', 3.2)],
  );

  expect(bands[0].to).toBe(3.2);
  // A little below the measured floor, so the slab a person stands on is in
  // the band instead of cut away with the floor below.
  expect(bands[0].from).toBe(-FLOOR_MARGIN_M);
});

test('the topmost floor gets the height the others have', () => {
  // Taken from the building instead of assumed, so a plant room and an office
  // block both get a sensible one.
  const bands = bandsFrom(
    ['L1', 'L2', 'L3'],
    [...floor('L1', 0), ...floor('L2', 4), ...floor('L3', 8)],
  );

  expect(bands[2].to).toBe(12);
});

test('storeys within half a metre become one floor, keeping every name', () => {
  // 2116_FEAS_kedelhuset declares twenty six storeys and four of them sit
  // within twenty centimetres. As separate bands they show almost nothing.
  const bands = bandsFrom(
    ['A', 'B', 'C', 'D'],
    [
      ...floor('A', 0),
      ...floor('B', 0.07),
      ...floor('C', 0.18),
      ...floor('D', 3.2),
    ],
  );

  expect(bands.length).toBe(2);
  expect(bands[0].names).toEqual(['A', 'B', 'C']);
  expect(bands[1].names).toEqual(['D']);
});

test('choosing any name of a merged floor finds the same band', () => {
  const bands = bandsFrom(['A', 'B'], [...floor('A', 0), ...floor('B', 0.1)]);

  expect(bandOf(bands, 'A')).toBe(bandOf(bands, 'B'));
});

test('a floor just beyond the merge distance stays its own', () => {
  const bands = bandsFrom(
    ['A', 'B'],
    [...floor('A', 0), ...floor('B', MERGE_WITHIN_M + 0.01)],
  );

  expect(bands.length).toBe(2);
});

test('order comes from measured height, not from how the model lists them', () => {
  // The Molecular Biology model lists its storeys in an order that does not
  // match where they are.
  const bands = bandsFrom(
    ['Roof', 'Ground', 'First'],
    [...floor('Roof', 9), ...floor('Ground', 0), ...floor('First', 4.5)],
  );

  expect(bands.map((b: Band) => b.names[0])).toEqual([
    'Ground',
    'First',
    'Roof',
  ]);
});

test('one object hanging below the slab does not set the floor', () => {
  // The lower quartile instead of the minimum, for exactly this.
  const bands = bandsFrom(
    ['L1'],
    [{ storey: 'L1', base: -4 }, ...floor('L1', 0)],
  );

  expect(bands[0].from).toBe(-FLOOR_MARGIN_M);
});

test('a storey the model declares but fills with nothing gets no band', () => {
  const bands = bandsFrom(
    ['L1', 'Empty', 'L2'],
    [...floor('L1', 0), ...floor('L2', 3)],
  );

  expect(bands.length).toBe(2);
});

test('a model with no storeys gets no bands instead of an invented floor', () => {
  // A bridge, a road and a railway declare none at all.
  expect(bandsFrom([], [])).toEqual([]);
  expect(bandsFrom(['L1'], [])).toEqual([]);
});

test('an object with no finite base is ignored instead of poisoning the floor', () => {
  const bands = bandsFrom(
    ['L1'],
    [
      { storey: 'L1', base: Number.NaN },
      { storey: 'L1', base: Infinity },
      ...floor('L1', 2),
    ],
  );

  expect(bands.length).toBe(1);
  expect(bands[0].from).toBe(2 - FLOOR_MARGIN_M);
});

test('an unknown storey name has no band', () => {
  const bands = bandsFrom(['L1'], floor('L1', 0));

  expect(bandOf(bands, 'Basement')).toBeUndefined();
});
