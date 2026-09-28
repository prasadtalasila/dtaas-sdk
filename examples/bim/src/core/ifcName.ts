/**
 * The name of the building an IFC file holds, read from the file itself.
 *
 * An IFC file is text, ISO 10303-21, and names its project and its building
 * near the top, within the first 6 KB even in a 64 MB model, so the name is
 * read from the start of the file and the rest of it is never fetched.
 *
 * The order tried is the project's LongName, the project's Name, the
 * building's LongName, the building's Name: across the real models this was
 * built against, the building's own name was often empty, template text, or
 * misspelt, while the project's LongName carried the real one. Most files
 * carry no name at all, and a Revit export nobody filled in keeps the
 * template text, so both placeholders and bare identifiers are skipped.
 *
 * Nothing here knows any building. The name is whatever the file says.
 */

/** How much of the file is read, which is ten times the furthest name found. */
export const IFC_HEAD_BYTES = 64 * 1024;

// Text an authoring tool writes into a new file and nobody replaced.
const PLACEHOLDERS = new Set([
  'project name',
  'project number',
  'project status',
  'building name',
  'default',
  'site',
]);

// Only digits and separators: a job or project number, not a name.
const IDENTIFIER = /^[\d\s./_-]+$/;

// Positions of the attributes read, counted from zero, the same in IFC2X3 and
// IFC4 for these two entities.
const PROJECT = { name: 2, longName: 5 };
const BUILDING = { name: 2, longName: 7 };

/** The value as a name, or null when it is empty, a placeholder or a number. */
export function usableName(value: string | null): string | null {
  if (value === null) return null;
  const text = value.trim();
  if (!text || PLACEHOLDERS.has(text.toLowerCase()) || IDENTIFIER.test(text)) {
    return null;
  }
  return text;
}

/** Decode a `\X2\`/`\X4\` escaped run of code units, closed by `\X0\`. */
function decodeWideRun(
  raw: string,
  i: number,
): { text: string; next: number } | 'stop' {
  const width = raw[i + 2] === '2' ? 4 : 8;
  const end = raw.indexOf('\\X0\\', i + 4);
  if (end === -1) return 'stop';
  const hex = raw.slice(i + 4, end);
  const units: number[] = [];
  for (let k = 0; k + width <= hex.length; k += width) {
    units.push(parseInt(hex.slice(k, k + width), 16));
  }
  const text =
    width === 4
      ? String.fromCharCode(...units)
      : String.fromCodePoint(...units);
  return { text, next: end + 4 };
}

/** `\X\hh`: one byte of the current code page, given as two hex digits. */
function decodeByteEscape(
  raw: string,
  i: number,
): { text: string; next: number } {
  return {
    text: String.fromCharCode(parseInt(raw.slice(i + 3, i + 5), 16)),
    next: i + 5,
  };
}

/** `\S\c`: the upper half of the current code page, ISO 8859-1 unless a `\P?\` switch said otherwise. */
function decodeUpperHalf(
  raw: string,
  i: number,
): { text: string; next: number } {
  return {
    text: String.fromCharCode(raw.charCodeAt(i + 3) + 128),
    next: i + 4,
  };
}

/** One escape sequence at `i`, `'stop'` when it never closes, null when `i` starts none. */
function decodeEscape(
  raw: string,
  i: number,
): { text: string; next: number } | 'stop' | null {
  if (raw.startsWith('\\\\', i)) return { text: '\\', next: i + 2 };
  if (raw.startsWith('\\X2\\', i) || raw.startsWith('\\X4\\', i))
    return decodeWideRun(raw, i);
  if (raw.startsWith('\\X\\', i)) return decodeByteEscape(raw, i);
  if (raw.startsWith('\\S\\', i)) return decodeUpperHalf(raw, i);
  // A code page switch: the pages are all ISO 8859 and the files read here
  // use the default one, so the switch itself carries no character.
  if (/^\\P[A-I]\\/.test(raw.slice(i, i + 4))) return { text: '', next: i + 4 };
  return null;
}

/** The next output chunk from `raw[i]`, or `'stop'` to end decoding there. */
function nextChunk(
  raw: string,
  i: number,
): { text: string; next: number } | 'stop' {
  const char = raw[i];
  if (char === "'" && raw[i + 1] === "'") return { text: "'", next: i + 2 };
  if (char !== '\\') return { text: char, next: i + 1 };
  const escape = decodeEscape(raw, i);
  return escape ?? { text: char, next: i + 1 };
}

/**
 * A STEP string as the text it stands for.
 *
 * ISO 10303-21 keeps a file in seven bit ASCII and spells everything else as
 * an escape. Two appear in the real models: `\X\E6` is one ISO 8859-1 byte,
 * æ, and `\X2\00D8\X0\` is UTF-16, Ø. A quote is doubled and a backslash is
 * doubled.
 */
export function decodeStepString(raw: string): string {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const chunk = nextChunk(raw, i);
    if (chunk === 'stop') break;
    out += chunk.text;
    i = chunk.next;
  }
  return out;
}

/** The quoted string starting at `text[start]`, with doubled quotes kept literal. */
function scanString(
  text: string,
  start: number,
): { value: string; next: number } | null {
  let i = start + 1;
  let value = "'";
  while (i < text.length) {
    const char = text[i];
    value += char;
    if (char !== "'") {
      i += 1;
    } else if (text[i + 1] === "'") {
      value += "'";
      i += 2;
    } else {
      return { value, next: i + 1 };
    }
  }
  return null;
}

interface ArgState {
  args: string[];
  depth: number;
  current: string;
}

/** Fold one non-string character into the parse state, or close the call. */
function applyStructuralChar(
  state: ArgState,
  char: string,
): 'closed' | undefined {
  if (char === '(') {
    state.depth += 1;
    state.current += char;
  } else if (char === ')') {
    if (state.depth === 0) return 'closed';
    state.depth -= 1;
    state.current += char;
  } else if (char === ',' && state.depth === 0) {
    state.args.push(state.current.trim());
    state.current = '';
  } else {
    state.current += char;
  }
  return undefined;
}

/** One entity statement's arguments, split at depth zero, from `start`. */
function readArguments(text: string, start: number): string[] | null {
  const state: ArgState = { args: [], depth: 0, current: '' };
  let i = start;
  while (i < text.length) {
    const char = text[i];
    if (char === "'") {
      const scanned = scanString(text, i);
      if (!scanned) return null;
      state.current += scanned.value;
      i = scanned.next;
    } else if (applyStructuralChar(state, char) === 'closed') {
      state.args.push(state.current.trim());
      return state.args;
    } else {
      i += 1;
    }
  }
  // The statement ran past what was read, so nothing in it can be trusted.
  return null;
}

/**
 * The arguments of the first entity of a type, as written, or null.
 *
 * Split on the commas at the top level, so a list such as `(#22)` and a
 * string holding a comma each stay one argument.
 */
export function entityArguments(text: string, entity: string): string[] | null {
  const start = new RegExp(`=\\s*${entity}\\s*\\(`, 'i').exec(text);
  if (!start) return null;
  return readArguments(text, start.index + start[0].length);
}

/** An argument as text when it is a string, or null for $, * and references. */
function stringArgument(arg: string | undefined): string | null {
  if (!arg || arg.length < 2 || !arg.startsWith("'") || !arg.endsWith("'")) {
    return null;
  }
  return decodeStepString(arg.slice(1, -1));
}

/** The name the file gives its building, or null when it gives none. */
export function ifcBuildingName(text: string): string | null {
  const project = entityArguments(text, 'IFCPROJECT') ?? [];
  const building = entityArguments(text, 'IFCBUILDING') ?? [];
  const candidates = [
    project[PROJECT.longName],
    project[PROJECT.name],
    building[BUILDING.longName],
    building[BUILDING.name],
  ];
  for (const candidate of candidates) {
    const name = usableName(stringArgument(candidate));
    if (name) return name;
  }
  return null;
}
