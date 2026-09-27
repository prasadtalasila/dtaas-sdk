# `@into-cps-association/dtaas-sdk` — Design

**Date:** 2026-09-27
**Status:** Approved
**Source documents:** `docs/dtaas-client-modular-architecture.md` (§4, §6, §8.1,
§8.3, §9, increment 1) and the companion report in `docs/visualization/tex/`
(requirements R1–R11, six-layer architecture).

## 1. Intent

The SDK is the **contract** between the DTaaS web client (host), the common
visualisation core (`dtaas-visualisation`) and domain extensions (`*-kit`).
It lets a kit be developed, type-checked and conformance-tested in its own
repository without cloning DTaaS, and lets the host validate every compiled-in
extension before wiring it.

Success criteria:

1. A kit written against the SDK type-checks, passes `checkConformance()` and
   is rejected by `validateExtension()` when it breaks a rule of §6/§8.3.
2. The host bundles only the root entry (types + tiny helpers + React context);
   testing, schema and lint code never reach `dtaas-web`.
3. A `visualisation.json` is validated by a published zod schema, including
   cross-references.
4. The published tarball contains only `dist/`, `package.json`, `README.md`,
   `LICENSE.md`, `CHANGELOG.md`, and every subpath imports in plain Node.
5. All local checks (lint, typecheck, unit, integration, e2e smoke, build)
   and the GitHub Actions workflow pass.

## 2. Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| Location | Standalone repository `dtaas-sdk` |
| Version | npm `0.1.0`; contract revision `sdk: 1` in each extension (independent of the npm version) |
| Visualisation types | In the SDK, **with zod schemas** (`./schema`) |
| Root helpers | `defineExtension`, lazy guards, `validateExtension`, env config helpers |
| ESLint shareable config | `./eslint` subpath, core rules only |
| Testing kit | `fakeHostServices`, `renderWithHost`, `replayFixture`, `checkConformance` |
| Test layout | `tests/unit`, `tests/integration`, `tests/e2e` |
| E2E | Packed-tarball smoke test only |
| Example | `examples/hello-kit` following the kit layout of §7.2 |
| Licence | INTO-CPS Association licence (`SEE LICENSE IN LICENSE.md`) |
| CI/publish | DTaaS style: validate on push/PR; publish to GitHub Packages and npmjs on push to `main` |
| Docs | README, DEVELOPER, CHANGELOG, and `docs/` guides |

## 3. Package shape

One package, ESM only, `sideEffects: false`, four subpath exports:

| Subpath | Contents | Runtime imports |
| --- | --- | --- |
| `.` | All contract types; `HostProvider`, `useHost`; `defineExtension`; `isLazyComponent`, `isLazyLoader`; `validateExtension`; `readExtensionConfig`, `isExtensionDisabled`; constants | `react` |
| `./schema` | zod schemas for encodings, anchors, transports, substrates, presets, `visualisation.json` | `zod` |
| `./testing` | `fakeHostServices`, `renderWithHost`, `replayFixture`, `checkConformance` | `react`, `zod`, `@testing-library/react`, `react-router-dom` |
| `./eslint` | Flat-config array enforcing §6.3 | none |

**ESM only**, because a dual ESM/CJS build can load two copies of the React
`HostContext` (host via ESM, kit via CJS), which silently breaks `useHost()`.
Hosts running ts-jest in CJS mode transform the package
(`transformIgnorePatterns`), exactly as DTaaS already does for `bim-kit`.

**Peer dependencies:** `react >=19` and `zod ^4` (required);
`@testing-library/react >=16`, `react-router-dom >=7`, `eslint >=9` (optional).
Redux is not a peer: `ExtensionReducer<S>` is a structural type that RTK
reducers are assignable to (proved by a compile-time test).

## 4. Tooling (follows DTaaS `lib/dt-automation` and `client/`)

- Yarn 1.22.22, `packageManager` field; Node `>=24` (DTaaS CI uses 24).
- Build: `tsup` (ESM, four entries) + `tsc --emitDeclarationOnly` + `tsc-alias`.
- TypeScript 6.0.3, strict, `src/*` and `tests/*` path aliases.
- Jest 30 + ts-jest 29 + jsdom; `@testing-library/react` + `jest-dom`.
- ESLint 9.39.5 flat config: `eslint:recommended`, `plugin:react/recommended`,
  `airbnb-base`, `plugin:@typescript-eslint/recommended`, `prettier`,
  `react-hooks` — with the DTaaS client's rule overrides.
- Prettier: `singleQuote`, `trailingComma: all`.
- Code rules from DTaaS `AGENTS.md`: functions < 25 lines, files < 250 lines,
  comments only where logic is non-obvious; interfaces over types; PascalCase
  for components, camelCase for utilities, `*.types.ts` / `*.schema.ts`
  suffixes; `globalThis` over `window`; `node:` prefixes.
- Coverage gate: 90 % lines/statements/functions, 85 % branches (unit +
  integration), matching the Codecov project target.

## 5. Source layout

```
src/
  index.ts
  extension/
    extension.types.ts       DtaasExtension, ExtensionRoute, NavigationItem, DigitalTwinTab,
                             AssetPreview, ExtensionConfigSpec, ExtensionReducer, LazyPage
    defineExtension.ts
    lazy.ts                  isLazyComponent, isLazyLoader
    constants.ts             SDK_MAJOR, STANDARD_SUBSTRATES, STANDARD_ANCHOR_KINDS,
                             RESERVED_EXTENSION_IDS, env key names
    validateExtension.ts     orchestrates rules, returns ValidationResult
    validationRules.ts       identity, laziness, uniqueness, substrate rules
    extensionConfig.ts       readExtensionConfig, isExtensionDisabled
  host/
    auth.types.ts library.types.ts contents.types.ts git.types.ts
    signals.types.ts viz.types.ts ui.types.ts
    hostServices.types.ts    HostServices
    HostProvider.tsx         HostProvider, useHost
  visualisation/
    signal.types.ts          Channel, SignalSample, Sampled, TransportAdapter
    anchor.types.ts          StandardAnchorKind, AnchorKind, Anchor
    encoding.types.ts        Encoding union (inferred from schema), ResolvedEncoding
    substrate.types.ts       SubstrateAdapter, SubstrateDescriptor, ElementRef, FrameOptions
    contribution.types.ts    DomainContribution, AnchorKindSpec, ConverterSpec, EncodingPreset,
                             ScopeRule, FieldKernelSpec, LazySubstrateAdapterSpec
    digitalTwin.types.ts     DigitalTwinSummary, TbEntity
    asset.types.ts           VisualisationAsset (inferred from schema)
  schema/
    index.ts encoding.schema.ts anchor.schema.ts transport.schema.ts
    substrate.schema.ts preset.schema.ts visualisation.schema.ts
  testing/
    index.ts fakeHostServices.ts fakeSignals.ts memoryContents.ts memoryGit.ts
    fakeViz.ts renderWithHost.tsx replayFixture.ts checkConformance.tsx
    mountAll.tsx socketGuard.ts
  eslint/
    index.ts
```

Types that have a schema are inferred from it (`z.infer`) so the two cannot
drift; the root entry imports them with `import type`, so `zod` is not a
runtime import of `.`.

## 6. Contract

### 6.1 Extension

Faithful to §6.1 of the architecture document:

```ts
interface DtaasExtension<S = unknown> {
  id: string; name: string; version: string; sdk: 1;
  routes?: ExtensionRoute[];            // { path: string; element: LazyPage }
  navigation?: NavigationItem[];        // { label; path; icon?: ComponentType; order?: number }
  digitalTwinTabs?: DigitalTwinTab[];   // { id; label; applies(dt); element: LazyPage<{ dt }> }
  assetPreviews?: AssetPreview[];       // { id; extensions?; mimeTypes?; element: LazyPage<{ url; name }> }
  reducer?: ExtensionReducer<S>;
  config?: ExtensionConfigSpec;         // { schema: ZodType }
  setup?: (host: HostServices) => void | Promise<void>;
  visualisation?: DomainContribution;
}
```

`LazyPage<P>` is `LazyExoticComponent<ComponentType<P>>`.

`DomainContribution` = `{ detect, anchorKinds?, converters?, presets?, scopes?,
fieldKernels?, substrates?, inspectorPanel? }` with:

- `AnchorKindSpec { kind; substrates: string[]; label?; validateRef?(ref): boolean; resolve(anchor, adapter): ElementRef | null }`
- `ConverterSpec { id; from: string[] (file extensions); to: string; load: () => Promise<{ default: Converter }> }`
- `EncodingPreset` — inferred from `encodingPresetSchema`: `{ id; label; substrate; encodings: { target; encoding }[]; description? }`
- `ScopeRule { id; label; group(elementIds, context): Record<string, string[]> }`
- `FieldKernelSpec { id; load: () => Promise<{ default: FieldKernel }> }`
- `LazySubstrateAdapterSpec { id; supports: AnchorKind[]; load: () => Promise<{ default: SubstrateAdapterFactory }> }`

### 6.2 Host services

Faithful to §6.2: `auth`, `library`, `contents`, `git`, `signals`, `viz`, `ui`,
`logger`, `settings`, `config`. The host gives **each extension its own**
`HostServices` instance so that `config(schema)` reads that extension's
`REACT_APP_EXT_<ID>_*` keys. Components receive it through `useHost()`;
non-React code receives it as the argument of `setup()`.

`useHost()` throws `Error('useHost() must be used inside <HostProvider>')`
outside a provider.

### 6.3 Visualisation types (report §3)

- `Channel = 'measured' | 'simulated' | 'predicted' | 'setpoint'`
- `SignalSample { twinId; signalPath; channel; ts; value; quality? }`
- `Sampled { value; ts; quality? }`
- `TransportAdapter { id; connect; subscribe; range?; disconnect }`
- `StandardAnchorKind` = the ten kinds of the report; `AnchorKind = StandardAnchorKind | (string & {})`
- `Anchor { signalPath; kind; ref; label?; homographyId? }`
- Encoding vocabulary (discriminated on `type`): `colorScale`, `visibility`,
  `transform`, `flow`, `residual`, `ghost`, `label`, `attention`, `glyph`,
  `regionFill`, `fieldOverlay`, `trajectory`.
- `SubstrateAdapter` exactly as the report's interface.

## 7. Helpers

### 7.1 `defineExtension(ext)`

Identity function returning `ext`, for inference and readability.

### 7.2 Lazy guards

- `isLazyComponent(x)`: `x?.$$typeof === Symbol.for('react.lazy')`.
- `isLazyLoader(x)`: a function of arity 0.

### 7.3 `validateExtension(ext, options?) → { valid: boolean; errors: string[] }`

Never throws. Options: `reservedIds` (default `RESERVED_EXTENSION_IDS`).
Rules:

1. `id` matches `^[a-z][a-z0-9-]*$` and is not reserved; `name`, `version` non-empty.
2. `sdk === SDK_MAJOR` (1).
3. Every route/tab/preview `element` and `inspectorPanel` is lazy; every
   converter/field-kernel/substrate `load` is a lazy loader.
4. No duplicate route paths, navigation paths, tab ids, preview ids, anchor
   kinds, converter ids, preset ids, scope ids, kernel ids, substrate ids.
5. No contributed substrate id is in `STANDARD_SUBSTRATES`
   (`image`, `aec`, `mesh`, `video`, `embed`, `geo`, `field`).
6. Each preset's `substrate` is standard or contributed by this extension.
7. `visualisation.detect` is a function when `visualisation` is present.

Cross-extension merging (duplicate ids across kits) stays in the host's
`createExtensionHost`.

### 7.4 Env config

- `readExtensionConfig(id, schema, env)` collects keys prefixed
  `REACT_APP_EXT_<ID>_` (id upper-cased, `-` → `_`), strips the prefix,
  converts `SCREAMING_SNAKE` to `camelCase`, returns `schema.safeParse(obj)`.
- `isExtensionDisabled(id, env)` splits `REACT_APP_EXTENSIONS_DISABLED` on
  commas/whitespace.

## 8. Schema (`./schema`)

- `encodingSchema` (discriminated union), `anchorSchema`, `transportSchema`
  (discriminated on `adapter`: `mqtt`, `stomp`, `thingsboard`, `influx`,
  `http`, `file`), `calibrationSchema` (homography: ≥ 4 point pairs, equal
  lengths), `substrateDescriptorSchema`, `encodingPresetSchema`.
- `visualisationAssetSchema`: `schemaVersion` `1.x`, `name`, `layout`,
  `substrates`, `transports`, `anchors`, `encodings` (each has `encoding`
  or `preset`), optional `presets`. Cross-reference checks: layout panes,
  encoding substrates and anchor `homographyId`s all resolve.
- `parseVisualisationAsset(json)` convenience returning `safeParse` result.

## 9. Testing kit (`./testing`)

- `fakeHostServices(options?)` → `FakeHostServices`: a complete, jest-agnostic
  `HostServices` with in-memory contents and git, fake signals (`emit`,
  latest-at-or-before `valueAt`, controllable playhead, `range`), an in-memory
  viz store, and `recorded.{ snackbars, logs, commits }`. Options: `env`,
  `extensionId`, `user`, `baseUrl`, `overrides`.
- `renderWithHost(ui, { host?, route? })` → RTL result plus `host`; wraps in
  `HostProvider`, `MemoryRouter` and `Suspense`.
- `replayFixture(fake, samples, { from, to, step, paths, channel })` →
  `{ t, values }[]`: emits samples then samples `valueAt` at each playhead step.
- `checkConformance(ext, options?)` → `{ passed, errors }`: `validateExtension`,
  preset schema validation, `setup(fake)`, mounts every route and tab (awaits
  lazy resolution, catches render errors), socket guard (`WebSocket`,
  `EventSource` constructions are errors).

## 10. ESLint config (`./eslint`)

Default export: flat-config array. Rules:

- `no-restricted-imports`: `@into-cps-association/dtaas-web` and subpaths;
  `@into-cps-association/dtaas-visualisation` except `contribute` and
  `contribute/*`; `mqtt`, `@stomp/stompjs`, `@influxdata/influxdb-client`,
  `socket.io-client`, `ws`.
- `no-restricted-globals`: `WebSocket`, `EventSource`.
- `no-restricted-properties`: `globalThis.env`, `window.env`,
  `globalThis.WebSocket`, `window.WebSocket`.

## 11. Tests

| Level | Location | What |
| --- | --- | --- |
| Unit | `tests/unit/**` (mirrors `src/`) | every helper, rule, schema, fake and component |
| Integration | `tests/integration/**` | hello-kit via `checkConformance`; fixture replay of a recorded stream; `HostProvider` + lazy route through `renderWithHost`; junction-7 `visualisation.json` round trip; ESLint config against violating sources |
| E2E | `tests/e2e/smoke-package.mjs` | build, `yarn pack`, tarball allowlist, install into a temp project with peers, import each subpath in Node and exercise one function |

## 12. Example kit

`examples/hello-kit/` with `package.json` and `src/{core,react,dtaas}` per §7.2:
`dtaas/index.ts` (the extension), `pages/HelloPage.tsx` (lazy, uses
`useHost()`), `anchors.ts` (`hello-node` anchor kind on `image`),
`presets/index.ts` (one `colorScale` preset on `image`), `config.ts` (zod
schema for `REACT_APP_EXT_HELLO_*`). Resolves the SDK through the
`@into-cps-association/dtaas-sdk` path alias.

## 13. Docs

`README.md`, `DEVELOPER.md`, `CHANGELOG.md` (Keep a Changelog), and
`docs/extension-authoring.md`, `docs/host-integration.md`,
`docs/visualisation-schema.md`, `docs/testing.md`.

## 14. CI

- `.github/workflows/dtaas-sdk.yml`: `validate` job on push/PR (Node 24):
  install (frozen lockfile), `syntax`, `typecheck`, `test:unit`, `test:int`,
  `build`, `test:e2e`, Codecov upload.
- Publish jobs on push to `main` via reusable `.github/workflows/publish-npm.yml`
  to GitHub Packages and npmjs. Guarded by
  `github.repository_owner == 'INTO-CPS-Association'` so a personal fork never
  publishes. Prerelease versions publish with `--tag next`.
- `.codecov.yml`, `.qlty/qlty.toml`, `.editorconfig`.

## 15. Out of scope

`createExtensionHost`, `HostProvider` *implementation* of services, the
`dtaas-visualisation` runtime, and the host changes of §8.2 — they belong to
DTaaS increments 2–4.
