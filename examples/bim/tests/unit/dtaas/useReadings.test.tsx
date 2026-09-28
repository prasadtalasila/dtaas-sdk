import { act, renderHook } from '@testing-library/react';
import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import type { SignalSample } from '@into-cps-association/dtaas-sdk';
import type { Binding } from 'src/core';
import useReadings from 'src/dtaas/useReadings';

const binding = (globalId: string, topic: string): Binding => ({
  selector: { globalId },
  label: globalId,
  source: { live: { transport: 'mqtt', topic } },
  display: { unit: '°C', ramp: [18, 26] },
});

const bindingA = binding('A', 't1');
const bindingB = binding('B', 't1');
const bindingC = binding('C', 't2');

// Hoisted so every `renderHook` callback passes the *same* array reference
// on each internal re-render. `useReadings`'s effect depends on `bindings`
// by identity; a fresh literal recreated on every render would never
// stabilise, and its state update on mount would re-render forever.
const allBindings = [bindingA, bindingB, bindingC];
const onlyA = [bindingA];

const sampleOn = (
  signalPath: string,
  value: SignalSample['value'],
  ts: number,
): SignalSample => ({
  twinId: 't',
  signalPath,
  channel: 'measured',
  ts,
  value,
});

describe('useReadings', () => {
  it('sets readings for every binding on the sampled topic', () => {
    const { signals } = fakeHostServices();
    const { result } = renderHook(() => useReadings(signals, allBindings));

    act(() => signals.emit(sampleOn('t1', 5, 100)));

    expect(result.current.readings.get('A')).toEqual({
      value: 5,
      receivedAt: 100,
    });
    expect(result.current.readings.get('B')).toEqual({
      value: 5,
      receivedAt: 100,
    });
    expect(result.current.readings.has('C')).toBe(false);
  });

  it('leaves an existing reading unchanged when a later sample is non-numeric', () => {
    const { signals } = fakeHostServices();
    const { result } = renderHook(() => useReadings(signals, onlyA));

    act(() => signals.emit(sampleOn('t1', 5, 100)));
    expect(result.current.readings.get('A')).toEqual({
      value: 5,
      receivedAt: 100,
    });

    // A string or boolean sample must be ignored, not just "add nothing":
    // it must not clear or overwrite the reading already on record.
    act(() => signals.emit(sampleOn('t1', 'x', 200)));
    expect(result.current.readings.get('A')).toEqual({
      value: 5,
      receivedAt: 100,
    });

    act(() => signals.emit(sampleOn('t1', true, 300)));
    expect(result.current.readings.get('A')).toEqual({
      value: 5,
      receivedAt: 100,
    });
    expect(result.current.readings.size).toBe(1);
  });

  it('ignores a sample on a path no binding listens to', () => {
    const { signals } = fakeHostServices();
    const { result } = renderHook(() => useReadings(signals, onlyA));

    act(() => signals.emit(sampleOn('unbound', 5, 100)));

    expect(result.current.readings.size).toBe(0);
  });

  it('reports live until the bound topic goes down', () => {
    const { signals } = fakeHostServices();
    const { result } = renderHook(() => useReadings(signals, onlyA));

    expect(result.current.feed).toBe('live');
    act(() => signals.setConnection('down', ['t1']));
    expect(result.current.feed).toBe('down');
  });

  // `FakeConnection.set` only ever adds path overrides, so this checks a
  // fresh connection: chaining after the previous test would leave t1
  // down forever, which is not what "unaffected by another path" means.
  it('stays live when an unrelated topic goes down', () => {
    const { signals } = fakeHostServices();
    const { result } = renderHook(() => useReadings(signals, onlyA));

    act(() => signals.setConnection('down', ['other']));
    expect(result.current.feed).toBe('live');
  });

  it('unsubscribes and resets readings when bindings change to none', () => {
    const { signals } = fakeHostServices();
    const { result, rerender } = renderHook(
      ({ bindings }) => useReadings(signals, bindings),
      { initialProps: { bindings: [bindingA] as Binding[] } },
    );

    act(() => signals.emit(sampleOn('t1', 5, 100)));
    expect(result.current.readings.size).toBe(1);

    rerender({ bindings: [] });
    expect(result.current.readings.size).toBe(0);

    act(() => signals.emit(sampleOn('t1', 6, 200)));
    expect(result.current.readings.size).toBe(0);
  });

  it('unsubscribes on unmount', () => {
    const { signals } = fakeHostServices();
    const realSubscribe = signals.subscribe.bind(signals);
    const unsubscribed = jest.fn();
    jest
      .spyOn(signals, 'subscribe')
      .mockImplementation((paths, channel, sink) => {
        const unsubscribe = realSubscribe(paths, channel, sink);
        return () => {
          unsubscribed();
          unsubscribe();
        };
      });

    const { unmount } = renderHook(() => useReadings(signals, onlyA));
    unmount();

    expect(unsubscribed).toHaveBeenCalledTimes(1);
  });
});
