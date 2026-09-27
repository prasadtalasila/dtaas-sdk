/** Thrown when extension code opens a WebSocket or EventSource. */
export class SocketBlockedError extends Error {
  constructor(readonly url: string) {
    super(`Extension opened a socket to ${url}`);
    this.name = 'SocketBlockedError';
  }
}

export interface SocketGuard {
  /** URLs of every blocked connection attempt. */
  readonly attempts: string[];
  restore(): void;
}

const GUARDED = ['WebSocket', 'EventSource'] as const;

type GuardedGlobals = Record<(typeof GUARDED)[number], unknown>;

/**
 * Replaces `WebSocket` and `EventSource` with constructors that record the
 * URL and throw, so a kit that bypasses `HostServices.signals` is caught.
 */
const installSocketGuard = (): SocketGuard => {
  const attempts: string[] = [];
  const target = globalThis as unknown as GuardedGlobals;
  const originals = GUARDED.map(
    (name) => [name, Object.getOwnPropertyDescriptor(target, name)] as const,
  );
  function Blocked(url: string | URL) {
    attempts.push(String(url));
    throw new SocketBlockedError(String(url));
  }
  GUARDED.forEach((name) => {
    Object.defineProperty(target, name, {
      value: Blocked,
      configurable: true,
      writable: true,
    });
  });
  const restore = () =>
    originals.forEach(([name, descriptor]) => {
      if (descriptor) Object.defineProperty(target, name, descriptor);
      else delete target[name];
    });
  return { attempts, restore };
};

export default installSocketGuard;
