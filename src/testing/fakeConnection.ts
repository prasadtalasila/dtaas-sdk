import { useSyncExternalStore } from 'react';
import worstConnectionState from 'src/host/connection';
import type {
  ConnectionState,
  ConnectionStatus,
} from 'src/host/visualisation.types';

export interface FakeConnection extends ConnectionStatus {
  /** Set `paths`, or every path (clearing overrides) when omitted. */
  set(state: ConnectionState, paths?: readonly string[]): void;
}

/** Connection state a test controls; every path starts `live`. */
const createFakeConnection = (): FakeConnection => {
  let fallback: ConnectionState = 'live';
  const byPath = new Map<string, ConnectionState>();
  const listeners = new Set<() => void>();
  const get = (paths?: readonly string[]) =>
    paths === undefined
      ? worstConnectionState([fallback, ...byPath.values()])
      : worstConnectionState(paths.map((p) => byPath.get(p) ?? fallback));
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const set = (state: ConnectionState, paths?: readonly string[]) => {
    if (paths === undefined) {
      fallback = state;
      byPath.clear();
    } else paths.forEach((path) => byPath.set(path, state));
    listeners.forEach((listener) => listener());
  };
  return {
    get,
    set,
    use: (paths) => useSyncExternalStore(subscribe, () => get(paths)),
  };
};

export default createFakeConnection;
