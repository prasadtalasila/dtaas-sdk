import installSocketGuard, {
  SocketBlockedError,
} from 'src/testing/socketGuard';

describe('installSocketGuard', () => {
  it('blocks and records WebSocket and EventSource connections', () => {
    const guard = installSocketGuard();
    try {
      expect(() => new WebSocket('wss://broker/ws')).toThrow(
        SocketBlockedError,
      );
      expect(() => new EventSource('https://sse')).toThrow(
        'Extension opened a socket to https://sse',
      );
      expect(guard.attempts).toEqual(['wss://broker/ws', 'https://sse']);
    } finally {
      guard.restore();
    }
  });

  it('restores the original globals', () => {
    const original = globalThis.WebSocket;
    installSocketGuard().restore();
    expect(globalThis.WebSocket).toBe(original);
    expect('EventSource' in globalThis).toBe(false);
  });
});
