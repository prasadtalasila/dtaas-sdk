# `examples/bim` — Design

**Date:** 2026-09-28
**Status:** Approved
**Source:** `INTO-CPS-Association/ifc-utils` `packages/bim-kit` 0.1.1 (commit on
`main` as of 2026-09-28), architecture document §5.3, §7.2, §7.3 and increment 7.

## 1. Intent

Port `bim-kit` faithfully into a standalone example package, `examples/bim`,
and wire it to DTaaS through the SDK contract as the extension `bim`. The
example proves the SDK carries a real, heavy kit (three.js, MUI, web-ifc) and
it drives two SDK additions that the port exposed.

Success criteria:

1. `checkConformance(extension)` passes; no socket is opened.
2. Every bim-kit 0.1.1 behaviour covered by its 16 test suites still holds,
   now under Jest.
3. The model folder is never hard-coded: the default comes from the host and
   the user can choose another folder at run time.
4. A dropped broker shows as "not live" through the new SDK connection status.
5. All SDK checks and all bim checks pass locally and in GitHub Actions.

## 2. Decisions

| Topic | Decision |
| --- | --- |
| Scope | Full faithful port of bim-kit 0.1.1 (core, schema, converter, viewer, react) plus a `dtaas/` layer |
| Location | `examples/bim/`, standalone package `@into-cps-association/bim-example`, `private: true`, extension id `bim` |
| Tests | Jest 30 + ts-jest + jsdom + RTL + user-event; `tests/unit`, `tests/integration`, `tests/e2e`; gate 90/85 |
| SDK consumption | SDK is a peer; `yarn sdk` builds, packs and unpacks the SDK tarball into `examples/bim/node_modules` (a `file:` dependency copies the whole repo or fails lockfile integrity) |
| Dependencies | `dependencies`: `web-ifc`, `three`, `zod`. `peerDependencies` (also in `devDependencies`): `react`, `react-dom`, the SDK, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`. Everything else `devDependencies` |
| Routing convention | Option A1: extension routes mount at `/<id>/*`; navigation paths stay absolute and must be `/<id>` or under `/<id>/` |
| bim URLs | `/bim` and `/bim/models/:model`, folder in `?dir=` |
| Model folder | `?dir=` → `REACT_APP_EXT_BIM_MODELS_DIRECTORY` → `host.library.conventions.modelsDirectory`; user picks another with `DirectoryPicker` |
| Connection state | New required `SignalsService.connection`; amends the unpublished SDK 0.1.0 |

## 3. SDK changes (first, in their own commits)

### 3.1 Connection status

In `src/host/visualisation.types.ts`:

```ts
export type ConnectionState = 'connecting' | 'live' | 'down';

export interface ConnectionStatus {
  /** Worst state across the transports serving `paths` (all when omitted). */
  get(paths?: readonly string[]): ConnectionState;
  /** React hook; re-renders when that state changes. */
  use(paths?: readonly string[]): ConnectionState;
}

export interface SignalsService {
  // existing members
  readonly connection: ConnectionStatus;
}
```

Rules: severity `down` > `connecting` > `live`. `get([])` is `live` (nothing
is waiting). A path no transport serves is `down` (its values never arrive).
`get()` with no argument aggregates every transport; with no transports at
all it is `down`.

Fake: `createFakeSignals()` gains `connection` and
`setConnection(state, paths?)`. Default state `live`; `setConnection(state)`
sets the default, `setConnection(state, paths)` overrides those paths. `use`
follows the same subscribe/notify pattern as the fake playhead.

Types exported from the root entry. Docs: `host-integration.md`,
`extension-authoring.md`, `testing.md`; CHANGELOG 0.1.0 entry amended.

### 3.2 Navigation prefix rule

`validateExtension` adds: each `navigation[i].path` equals `/<id>` or starts
with `/<id>/`. Error text:
`navigation[<i>].path "<path>" must be under "/<id>"`. `/shmx` is rejected
for id `shm` (segment match, not string prefix). Docs state that the host
mounts extension routes at `/<id>/*`, so kits may use nested relative
`<Routes>`.

## 4. Package shape (`examples/bim`)

| Subpath | Contents | Pulls in |
| --- | --- | --- |
| `.` | binding, resolver, readings, alerts, ramp, storeys, ifcName, libraryPath | nothing |
| `./schema` | `readManifest`, schemas, `manifestToVisualisation` | `zod`, SDK `./schema` (types) |
| `./converter` | `convertIfc`, inlined web-ifc WASM | `web-ifc` |
| `./viewer` | `SceneView`, appearance, shortcuts, gizmo, outline, glow, field, fieldSheet | `three` |
| `./react` | `BuildingModels`, panels, `DirectoryPicker`, assets helpers | `react`, MUI |
| `./react/canvas` | `BimCanvas` (own chunk) | `three` |
| `./dtaas` | the `DtaasExtension` | SDK root |

Tooling mirrors the SDK root (TypeScript 6.0.3, Jest 30, ESLint 9.39.5 with
the same rule set, Prettier, tsup + `tsc` declarations). `src/` is also
linted with the SDK's `./eslint` kit config. `scripts/inline-wasm.mjs` runs
before build, typecheck and tests; `src/converter/generated/` is gitignored.
Scripts: `sdk`, `build`, `typecheck`, `format`, `format:check`, `lint`,
`syntax`, `test:unit`, `test:int`, `test:coverage`, `test:e2e`, `test:all`.

Root repo: root ESLint and `tsconfig.eslint.json` ignore `examples/bim/**`;
`.prettierignore` adds `examples/bim/`; root Jest adds `examples/bim` to
`modulePathIgnorePatterns`. CI gains a `bim-example` job (Node 24): root
install, bim install, `yarn sdk`, format, lint, typecheck, coverage, e2e.

## 5. Source layout

```
examples/bim/
  scripts/  inline-wasm.mjs  install-sdk.mjs
  src/
    core/       binding  resolver  readings  alerts  ramp  storeys  ifcName  libraryPath  index
    schema/     manifest.schema  migrate  index
    converter/  convertIfc (+ helpers)  generated/wasm.ts  index
    viewer/     sceneView (split)  appearance  shortcuts  gizmo  outline  glow  field  fieldSheet  index
    react/      BuildingModels (split into hooks and parts)  BimCanvas (split)  DirectoryPicker
                FloorPicker  HelpPanel  Legend  ObjectPanel  SensorCards  Toolbar  icons
                assets  ifcMeshes  exportGlb  scene  index
    dtaas/      index  config  detect  anchors  presets/index  scopes  converters
                converters/ifcToGlb  pages/BuildingsPage  useReadings  useModelRoute
  tests/  unit/  integration/  e2e/  fixtures/
  README.md  CHANGELOG.md  THIRD-PARTY-NOTICES.md
```

Faithfulness: behaviour and exported names of bim-kit are kept. Files over
250 lines and functions over 25 lines are split into hooks, subcomponents and
helpers without behaviour change. Comments that explain a non-obvious reason
are kept; narrative is trimmed.

## 6. Departures from bim-kit 0.1.1

1. `BuildingModels`: `directory` is required; new `selected?: string` (model
   stem) and `onSelect?(name)` make selection controllable, uncontrolled
   behaviour unchanged. Unknown `selected` shows
   `No model named <name> in <directory>`. `MODELS_DIRECTORY` removed.
2. `BuildingModels`: new `onBindingsChange?(bindings)`.
3. New `DirectoryPicker({ list, value, onChange })`: browses folders through
   an injected `list(path)`; knows nothing of DTaaS.
4. New `core/libraryPath`: `normaliseLibraryPath(raw)` returns a clean
   relative path or `null`; rejects `..`, `.`, leading `/`, `\`, empty
   segments and percent-encoded dot segments.
5. New `schema/migrate`: `manifestToVisualisation(manifest, { name, brokerUrl })`.
6. `exportGlb` extracted from `BimCanvas` so the converter spec reuses it.
7. `BuildingModels`: new `list?(directory): Promise<LibraryEntry[]>`; when
   absent the page fetches `contentsUrl(libraryUrl, directory)` as 0.1.1
   did. File bytes (IFC head, manifest, tree, GLB) are still fetched from
   `fileUrl`, since `ContentsService.get` has no range reads.

## 7. DTaaS layer

`BuildingsPage` (lazy) adapts `useHost()` to `BuildingModels`:

| Prop | Source |
| --- | --- |
| `directory` | `normaliseLibraryPath(?dir)`; absent → config `modelsDirectory` → `host.library.conventions.modelsDirectory`; invalid → error alert, nothing fetched |
| `selected`, `onSelect` | `:model`; select → `navigate('/bim/models/<name>?dir=<dir>')` |
| `DirectoryPicker` | `list = host.contents.list`; change → `navigate('/bim?dir=<folder>')` |
| `libraryUrl` | `host.library.useBaseUrl()` |
| `list` | `host.contents.list(directory)` mapped to `LibraryEntry` |
| `onPersistGeometry` | `host.contents.put('<dir>/<name>.glb', glb)`; rejection logged with `host.logger.warn` and rethrown so the page reports "not stored" |
| `readings`, `feed` | `useReadings(host.signals, bindings)` |

The page renders inside `host.ui.Page` titled `Buildings`.

`useReadings(signals, bindings)`: subscribes `topicsOf(bindings)` on channel
`measured` (a binding's MQTT topic is its signal path); maps each numeric
sample to every GlobalId bound to that topic via `bindingsByTopic`, as
`Reading { value, receivedAt: sample.ts }`; ignores non-numeric values;
`feed = signals.connection.use(topics)`. Unsubscribes on change and unmount.

Extension:

- `id: 'bim'`, `name: 'Buildings'`, `version: '0.1.0'`, `sdk: 1`.
- `routes`: `''` and `models/:model`, both the lazy `BuildingsPage`.
- `navigation`: `{ label: 'Buildings', path: '/bim', icon: ApartmentIcon, order: 20 }`.
- `config`: zod `{ modelsDirectory?: string }`; `setup` validates it and logs.
- `visualisation.detect`: `dt.domain === 'bim'` or any `.ifc` in `dt.files`.
- `anchorKinds`: `ifc-guid` on `aec`; `validateRef` is the 22-character
  GlobalId pattern; `resolve` delegates to `adapter.resolve(anchor)`.
- `converters`: `bim.ifc-to-glb`, from `.ifc` to `glb`, lazily loading
  `convertIfc` + `meshesFrom` + `exportGlb`.
- `presets`: `bim.thermal-comfort` (`colorScale`, 18–26) and `bim.co2`
  (`colorScale`, 400–1400), substrate `aec`.
- `scopes`: `bim.room`, `bim.storey`; group element ids by
  `handle.userData.room` / `.storey` of
  `adapter.resolve({ kind: 'ifc-guid', ref, signalPath: ref })`. The GLB's
  glTF `extras` carry only `globalId`, `ifcClass` and `predefinedType`; room
  and storey come from the property tree (`<model>.json`, `objects[globalId]`),
  so this assumes the `aec` substrate copies those facts onto the element's
  `userData`. Elements with neither are omitted. Recorded as an SDK gap:
  `ScopeContext` carries no element properties.
- No `fieldKernels`: bim's flood fill needs wall geometry, which the SDK's
  `FieldKernel(samples, grid)` does not carry. Recorded as an SDK gap.

## 8. Tests

- SDK: connection unit and type tests; navigation rule tests; existing gate.
- bim unit: the 16 bim-kit suites ported to Jest (`convert` under
  `@jest-environment node` against the three buildingSMART fixtures, CC BY 4.0,
  copied with attribution); new suites for libraryPath, migrate,
  DirectoryPicker, useReadings, useModelRoute, anchors, presets, scopes,
  detect, config, converter spec.
- bim integration: conformance; `BuildingsPage` via `renderWithHost`
  (query dir, default, config override, invalid dir, unknown model, select
  and folder navigation, persist, readings, `setConnection('down')`);
  manifest → migrate → `parseVisualisationAsset` → fake viz round trip.
- bim e2e: build, pack, allowlist, install with packed SDK and peers, import
  every subpath in Node.
- Coverage exclusions (explicit in `jest.config.json`): generated WASM
  module, re-export indexes, the WebGL render loop in `BimCanvas`.

## 9. Out of scope

Asset previews for `.ifc`/`.glb`, a field kernel, a DT tab, publishing the
example, and host-side implementation of `connection`.
