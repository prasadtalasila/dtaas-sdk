# Testing an extension

`@into-cps-association/dtaas-sdk/testing` lets a kit prove it satisfies the
contract without cloning or running DTaaS. It needs `@testing-library/react`
and `react-router-dom` as dev dependencies, and a `jsdom` test environment.

## `checkConformance(extension, options?)`

The one test every kit should have:

```ts
import { checkConformance } from '@into-cps-association/dtaas-sdk/testing';

it('satisfies the DTaaS extension contract', async () => {
  const report = await checkConformance(extension, {
    hostOptions: { env: { REACT_APP_EXT_WIND_SCADA_URL: 'https://scada' } },
  });
  expect(report).toEqual({ passed: true, errors: [] });
});
```

It runs, in order:

1. `validateExtension` (if it fails, the report stops here);
2. schema validation of every preset;
3. `setup(host)`;
4. mounts every route (at `/<id>/<path>`, with route parameters filled with
   `sample`), digital twin tab, asset preview and the inspector panel, waiting
   for lazy loading, and records render, effect and import errors;
5. a socket guard: any `WebSocket` or `EventSource` the kit opens is an error.

Options: `host` (a `fakeHostServices()` you prepared), `hostOptions`, `dt`
(the twin passed to tabs) and `timeoutMs` (per element, default 2000).

## `fakeHostServices(options?)`

A complete, in-memory `HostServices`, with no dependency on Jest:

```ts
const host = fakeHostServices({
  extensionId: 'wind',
  env: { REACT_APP_EXT_WIND_SCADA_URL: 'https://scada' },
  user: { username: 'ada' },
  files: { 'common/models/turbine.glb': bytes },
  now: () => 1_000,
});

host.signals.emit({
  twinId: 'wt1',
  signalPath: 'wt1/power',
  channel: 'measured',
  ts: 900,
  value: 2.1,
});
host.signals.playhead.set(950);

host.recorded.snackbars; // [{ message, severity }]
host.recorded.logs; // [{ level, args }]
host.recorded.commits; // git commits
host.recorded.savedAssets; // viz.save calls
```

- `signals.valueAt(path, channel, t)` returns the latest sample at or before
  `t`, or `undefined`.
- The playhead is live (follows `now`) until `set(t)`; `follow(true)` resumes.
- `viz.save` validates the asset against the schema, as the host does.
- Pass `overrides` to replace a whole service, e.g. with Jest mocks.

## `renderWithHost(ui, options?)`

Renders inside `HostProvider`, a `MemoryRouter` and `Suspense`, and returns
React Testing Library's result plus the `host`:

```tsx
const { host } = renderWithHost(<WindPage />, { route: '/wind' });
act(() => host.signals.playhead.set(2_000));
expect(screen.getByText('Turbine 1: 2.4')).toBeInTheDocument();
```

## `replayFixture(host, samples, options)`

Replays a recorded stream through the fake signals and samples it at each
playhead step: the core's fixture-replay test, applied to a kit.

```ts
const frames = replayFixture(host, recordedStream, {
  step: 1_000,
  channel: 'measured',
});
expect(frames.map((f) => f.values['wt1/power']?.value)).toEqual([
  2.1, 2.4, 2.2,
]);
```

Before each frame it emits the samples the playhead has reached, so
subscribers see them in order. Options: `step` (required), `from`, `to`,
`paths` and `channel` (default `measured`).
