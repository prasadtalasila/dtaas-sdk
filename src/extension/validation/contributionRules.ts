import { STANDARD_SUBSTRATES } from 'src/extension/constants';
import {
  asList,
  LIST_SPECS,
  type ListSpec,
  type Loose,
  visualisationOf,
} from 'src/extension/validation/validationUtils';

const STANDARD: ReadonlySet<string> = new Set(STANDARD_SUBSTRATES);

const duplicatesIn = (ext: Loose, spec: ListSpec): string[] => {
  const seen = new Set<string>();
  return asList(spec.pick(ext)).flatMap((item) => {
    const value = String(item[spec.key]);
    const duplicate = seen.has(value);
    seen.add(value);
    return duplicate ? [`${spec.label}: duplicate ${spec.key} "${value}"`] : [];
  });
};

/** Identifiers are unique within the extension. */
export const checkUniqueness = (ext: Loose): string[] =>
  LIST_SPECS.flatMap((spec) => duplicatesIn(ext, spec));

const substrateIds = (visualisation: Loose): string[] =>
  asList(visualisation.substrates).map((s) => String(s.id));

/** Kits add substrates but never replace standard ones (goal 9). */
export const checkSubstrates = (ext: Loose): string[] => {
  const visualisation = visualisationOf(ext);
  if (!visualisation) return [];
  const contributed = substrateIds(visualisation);
  const known = new Set([...STANDARD, ...contributed]);
  const collisions = contributed.flatMap((id, i) =>
    STANDARD.has(id)
      ? [
          `visualisation.substrates[${i}]: "${id}" is a standard substrate and cannot be replaced`,
        ]
      : [],
  );
  const unknown = asList(visualisation.presets).flatMap((preset, i) =>
    known.has(String(preset.substrate))
      ? []
      : [
          `visualisation.presets[${i}] "${String(preset.id)}": unknown substrate "${String(preset.substrate)}"`,
        ],
  );
  return [...collisions, ...unknown];
};

export const checkDetect = (ext: Loose): string[] => {
  const visualisation = visualisationOf(ext);
  return visualisation && typeof visualisation.detect !== 'function'
    ? ['visualisation.detect must be a function']
    : [];
};
