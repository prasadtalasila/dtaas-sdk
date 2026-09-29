const UNSAFE = new Set(['', '.', '..']);

const decoded = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const SEPARATOR = /[/\\\0]/;

const isUnsafe = (segment: string) => {
  const plain = decoded(segment);
  return UNSAFE.has(segment) || UNSAFE.has(plain) || SEPARATOR.test(plain);
};

/**
 * A user-supplied folder as a clean, library-relative path, or `null` when
 * it could leave the library. Percent-encoded dot segments and separators
 * are caught too, because the server may decode them again.
 */
export const normaliseLibraryPath = (
  raw: string | null | undefined,
): string | null => {
  if (!raw || raw.startsWith('/') || /[\\\0]/.test(raw)) return null;
  const segments = raw.replace(/\/+$/, '').split('/');
  return segments.some(isUnsafe) ? null : segments.join('/');
};

export default normaliseLibraryPath;
