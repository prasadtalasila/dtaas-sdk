/**
 * The sensor cards, rendered.
 *
 * MUI 9 removed the system props, such as display on Typography, and a prop it
 * no longer knows is dropped without a word. The label and the age of a reading
 * then run together on one line. This test reads the style the browser would
 * apply, so a layout that silently stops applying fails here.
 */

import { render, screen } from '@testing-library/react';
import { SensorCards } from 'src/react/SensorCards';
import type { Binding } from 'src/core';

const binding: Binding = {
  selector: { globalId: '0_sgz7bzz4Jh2ckU1ehFe$' },
  label: 'HX-1 temperature TS-01',
  source: { live: { transport: 'mqtt', topic: 'swim/B1/temperature/TS-01' } },
  display: { unit: '°C', ramp: [10, 50] },
};

test('the label and the age of a reading sit on lines of their own', () => {
  render(
    <SensorCards
      bindings={[binding]}
      readings={new Map()}
      feed="live"
      selected={null}
      onSelect={() => {}}
    />,
  );

  // A binding with no id of its own is titled by its label as well, so the
  // label under the title is the caption, the span.
  const label = screen
    .getAllByText('HX-1 temperature TS-01')
    .find((element) => element.tagName === 'SPAN');
  expect(label).toBeDefined();
  expect(getComputedStyle(label as Element).display).toBe('block');
  // The line under the label is the age, and it is a block as well, so the two
  // never share a line.
  const age = (label as Element).nextElementSibling as Element;
  expect(getComputedStyle(age).display).toBe('block');
});
