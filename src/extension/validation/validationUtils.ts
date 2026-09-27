/** An extension as untyped data: kits may be plain JavaScript. */
export type Loose = Record<string, unknown>;

export const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The objects of a list, or `[]` when the value is not a list. */
export const asList = (value: unknown): Loose[] =>
  Array.isArray(value) ? value.map((item) => (isObject(item) ? item : {})) : [];

export const visualisationOf = (ext: Loose): Loose | undefined =>
  isObject(ext.visualisation) ? ext.visualisation : undefined;

/** A contribution list and the property that identifies its entries. */
export interface ListSpec {
  readonly label: string;
  readonly key: string;
  pick(ext: Loose): unknown;
}

const topLevel = (name: string, key: string): ListSpec => ({
  label: name,
  key,
  pick: (ext) => ext[name],
});

const nested = (name: string, key: string): ListSpec => ({
  label: `visualisation.${name}`,
  key,
  pick: (ext) => visualisationOf(ext)?.[name],
});

export const LIST_SPECS: readonly ListSpec[] = [
  topLevel('routes', 'path'),
  topLevel('navigation', 'path'),
  topLevel('digitalTwinTabs', 'id'),
  topLevel('assetPreviews', 'id'),
  nested('anchorKinds', 'kind'),
  nested('converters', 'id'),
  nested('presets', 'id'),
  nested('scopes', 'id'),
  nested('fieldKernels', 'id'),
  nested('substrates', 'id'),
];

export const listSpec = (label: string): ListSpec =>
  LIST_SPECS.find((spec) => spec.label === label) as ListSpec;

/** E.g. `routes[1] "detail"`. */
export const entryLabel = (spec: ListSpec, item: Loose, index: number) =>
  `${spec.label}[${index}] "${String(item[spec.key] ?? '')}"`;
