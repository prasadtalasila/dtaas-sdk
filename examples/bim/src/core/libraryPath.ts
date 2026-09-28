const UNSAFE = new Set(['', '.', '..']);

const decoded = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const isUnsafe = (segment: string) =>
  UNSAFE.has(segment) || UNSAFE.has(decoded(segment));

/**
 * A user-supplied folder as a clean, library-relative path, or `null` when
 * it could leave the library. Percent-encoded dot segments are caught too,
 * because the server may decode them again.
 */
export const normaliseLibraryPath = (
  raw: string | null | undefined,
): string | null => {
  if (!raw || raw.startsWith('/') || /[\\\0]/.test(raw)) return null;
  const segments = raw.replace(/\/+$/, '').split('/');
  return segments.some(isUnsafe) ? null : segments.join('/');
};

export default normaliseLibraryPath;
