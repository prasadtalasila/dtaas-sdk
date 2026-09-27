import { useSyncExternalStore } from 'react';
import type { Playhead } from 'src/host/visualisation.types';

export interface FakePlayhead extends Playhead {
  /** Re-renders `use()` consumers; called when live data arrives. */
  notify(): void;
}

/** A playhead that is live (follows `now`) until a time is set. */
const createFakePlayhead = (now: () => number): FakePlayhead => {
  let live = true;
  let time = now();
  let snapshot = time;
  const listeners = new Set<() => void>();
  const get = () => (live ? now() : time);
  const notify = () => {
    snapshot = get();
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    get,
    notify,
    set: (t) => {
      live = false;
      time = t;
      notify();
    },
    follow: (follow) => {
      time = get();
      live = follow;
      notify();
    },
    use: () => useSyncExternalStore(subscribe, () => snapshot),
  };
};

export default createFakePlayhead;
