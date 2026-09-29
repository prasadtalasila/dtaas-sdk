import { normaliseLibraryPath } from 'src/core';

describe('normaliseLibraryPath', () => {
  it.each([
    ['common/models', 'common/models'],
    ['projects/aarhus/', 'projects/aarhus'],
    ['100% done', '100% done'],
    ['a b/[3D] c', 'a b/[3D] c'],
  ])('accepts %p', (raw, clean) => {
    expect(normaliseLibraryPath(raw)).toBe(clean);
  });

  it.each([
    '',
    '/etc',
    '..',
    '.',
    'a/../b',
    'a/./b',
    'a//b',
    'a\\b',
    'projects/%2e%2e/secret',
    'a/%2E',
    'a\u0000b',
    '..%2F..%2Fetc',
    'a%2F..%2Fb',
    'a%5Cb',
  ])('rejects %p', (raw) => {
    expect(normaliseLibraryPath(raw)).toBeNull();
  });

  it('rejects absent values', () => {
    expect(normaliseLibraryPath(null)).toBeNull();
    expect(normaliseLibraryPath(undefined)).toBeNull();
  });
});
