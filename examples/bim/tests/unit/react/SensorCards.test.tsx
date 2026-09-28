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

test('a sensor with no GlobalId shows a disabled card and no reading', () => {
  const nodeBinding: Binding = {
    selector: { nodeName: 'Pump-2' },
    label: 'Pump-2 flow rate',
    source: { live: { transport: 'mqtt', topic: 'swim/p2/flow' } },
    display: { unit: 'L/min', ramp: [0, 200] },
  };
  render(
    <SensorCards
      bindings={[nodeBinding]}
      readings={new Map([['irrelevant', { value: 1, receivedAt: Date.now() }]])}
      feed="live"
      selected={null}
      onSelect={() => {}}
    />,
  );

  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByText('Waiting')).toBeInTheDocument();
});

test('a note-level alert is chipped separately from a warning, with the payload unit', () => {
  const now = Date.now();
  render(
    <SensorCards
      bindings={[binding]}
      readings={
        new Map([
          [
            binding.selector.globalId as string,
            { value: 25, receivedAt: now, unit: '°C', kind: 'prediction' },
          ],
        ])
      }
      feed="live"
      selected={null}
      onSelect={() => {}}
    />,
  );

  expect(screen.getByText('1 not measured directly')).toBeInTheDocument();
  expect(screen.getByText('Prediction')).toBeInTheDocument();
});

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
