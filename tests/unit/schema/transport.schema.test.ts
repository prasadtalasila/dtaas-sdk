import { transportSchema } from 'src/schema/transport.schema';

describe('transportSchema', () => {
  it.each([
    { adapter: 'mqtt', url: 'wss://broker/ws', topics: ['a/+/b'] },
    { adapter: 'stomp', url: 'wss://broker/stomp', destinations: ['/topic/a'] },
    { adapter: 'thingsboard', url: 'wss://tb/ws', entityIds: ['e1'] },
    { adapter: 'influx', org: 'dtaas', bucket: 'b1', role: 'history' },
    { adapter: 'http', url: 'https://logger/api', intervalMs: 1000 },
    { adapter: 'file', url: 'lib://data/run.csv', channel: 'simulated' },
  ])('accepts a $adapter transport', (transport) => {
    expect(transportSchema.safeParse(transport).success).toBe(true);
  });

  it('rejects an unknown adapter', () => {
    const transport = { adapter: 'kafka', url: 'x' };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });

  it('requires at least one MQTT topic', () => {
    const transport = { adapter: 'mqtt', url: 'wss://broker/ws', topics: [] };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });

  it('rejects an unknown channel', () => {
    const transport = { adapter: 'file', url: 'x', channel: 'guessed' };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });
});
