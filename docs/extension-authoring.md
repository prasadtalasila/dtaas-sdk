# Writing a DTaaS extension

A domain extension (a _kit_) contributes only what is unique to its domain:
asset converters, anchor kinds, encoding presets, domain pages and
navigation. Transport, temporal state, encoding evaluation and the standard
substrates come from the common core through `HostServices`
(architecture §5).

## Package layout

```text
<domain>-kit/
  src/
    core/         framework-free domain logic: converters, anchor parsing, scope rules
    react/        domain components usable in any React app
    dtaas/        the DtaasExtension object
      index.ts    export const extension = defineExtension({ ... })
      pages/      lazy page components that call useHost()
      presets/    EncodingPreset[]
      anchors.ts  AnchorKindSpec[]
      config.ts   zod schema for REACT_APP_EXT_<ID>_* keys
  package.json    "exports": { "./dtaas": "./dist/dtaas/index.js", ... }
```

The host imports only the `./dtaas` subpath. `./core` and `./react` keep
working outside DTaaS. [`examples/hello-kit`](../examples/hello-kit) follows
this layout.

Declare the SDK, React, MUI and zod as **peer** dependencies:

```json
{
  "peerDependencies": {
    "@into-cps-association/dtaas-sdk": "^0.1.0",
    "react": ">=19",
    "zod": "^4.0.0"
  }
}
```

## The extension object

```ts
export const extension = defineExtension({
  id: 'pump', // lowercase; route prefix, Redux key, env.js key
  name: 'Water Networks',
  version: '0.1.0',
  sdk: 1, // contract revision
  routes: [{ path: '', element: lazy(() => import('./pages/PumpPage')) }],
  navigation: [{ label: 'Water Networks', path: '/pump', order: 30 }],
  digitalTwinTabs: [
    {
      id: 'schematic',
      label: 'Schematic',
      applies: (dt) => dt.files.some((f) => f.endsWith('.inp')),
      element: lazy(() => import('./pages/SchematicTab')),
    },
  ],
  assetPreviews: [
    {
      id: 'inp',
      extensions: ['.inp'],
      element: lazy(() => import('./pages/InpPreview')),
    },
  ],
  config: { schema: configSchema },
  setup: (host) => host.logger.info('pump-kit ready'),
  visualisation: {
    detect: (dt) => dt.domain === 'pump',
    anchorKinds,
    converters,
    presets,
    substrates: [
      {
        id: 'pid',
        supports: ['epanet'],
        load: () => import('./substrates/pid'),
      },
    ],
  },
});
```

### Rules the host enforces

`validateExtension()` and the host reject an extension when:

- `id` does not match `^[a-z][a-z0-9-]*$` or collides with a core route
  (`library`, `digitaltwins`, `workbench`, …);
- `sdk` is not `1`;
- a route, tab or preview `element`, or the `inspectorPanel`, is not a
  `React.lazy` component;
- a converter, field kernel or substrate `load` is not a zero-argument
  `() => import(...)` loader;
- two entries of one list share an identifier;
- a contributed substrate reuses a standard id (`image`, `aec`, `mesh`,
  `video`, `embed`, `geo`, `field`);
- a preset targets a substrate that is neither standard nor contributed.

Laziness keeps heavy code (WASM kernels, renderers) out of the host's entry
chunk.

## Using host services

Components call `useHost()`; `setup()` receives the same object.

```tsx
const host = useHost();
const user = host.auth.useUser();
const t = host.signals.playhead.use(); // re-renders on scrub
const value = host.signals.valueAt(path, 'measured', t); // never "latest value"
const { scadaUrl } = host.config(configSchema); // REACT_APP_EXT_PUMP_SCADA_URL
await host.contents.put('common/models/net.glb', bytes); // workspace files
await host.git.commit(repo, branch, changes, message); // versioned assets
host.ui.snackbar('Saved', 'success');
```

Read signals at the playhead, never as "the current value": one clock drives
every substrate, embedded panel and video (R4).

## Configuration

A kit reads its `env.js` keys through its schema. For id `pump`, the key
`REACT_APP_EXT_PUMP_SCADA_URL` becomes `scadaUrl`:

```ts
export default z.object({
  scadaUrl: z.url(),
  refreshMs: z.coerce.number().default(5000),
});
```

A deployment disables a compiled-in kit with
`REACT_APP_EXTENSIONS_DISABLED: 'pump'`.

## Lint rules

Spread the SDK's rules into the kit's `eslint.config.mjs`:

```js
import dtaasKitConfig from '@into-cps-association/dtaas-sdk/eslint';

export default [
  // ...your own configuration
  ...dtaasKitConfig,
];
```

They forbid importing `@into-cps-association/dtaas-web`, importing
`@into-cps-association/dtaas-visualisation` outside `contribute/*`, socket and
broker clients (`mqtt`, `@stomp/stompjs`, `@influxdata/influxdb-client`,
`socket.io-client`, `ws`), the `WebSocket` and `EventSource` globals, and
reading `globalThis.env` directly.

ESLint replaces, rather than merges, the options of a rule configured twice.
If your own configuration also sets `no-restricted-imports`,
`no-restricted-globals` or `no-restricted-properties`, put
`...dtaasKitConfig` last, or copy its options into yours.

## Testing

See [testing.md](testing.md). The minimum is one conformance test:

```ts
expect(await checkConformance(extension, { hostOptions: { env } })).toEqual({
  passed: true,
  errors: [],
});
```
