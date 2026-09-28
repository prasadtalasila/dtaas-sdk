import validateExtension from 'src/extension/validateExtension';
import { looseExtension } from 'tests/fixtures/extensions';

const errorsFor = (id: string, ...paths: string[]) => {
  const ext = looseExtension() as unknown as Record<string, unknown>;
  ext.id = id;
  ext.navigation = paths.map((path) => ({ label: path, path }));
  return validateExtension(ext).errors;
};

describe('navigation rule', () => {
  it('accepts the mount point and paths below it', () => {
    expect(errorsFor('shm', '/shm', '/shm/alarms')).toEqual([]);
  });

  it('accepts a query or hash on the mount point', () => {
    expect(errorsFor('bim', '/bim?dir=projects/a', '/bim#help')).toEqual([]);
  });

  it('rejects a path outside the mount point', () => {
    expect(errorsFor('shm', '/shm', '/bridges')).toEqual([
      'navigation[1].path "/bridges" must be under "/shm"',
    ]);
  });

  it('rejects a path that only shares a string prefix', () => {
    expect(errorsFor('shm', '/shmx')).toEqual([
      'navigation[0].path "/shmx" must be under "/shm"',
    ]);
  });

  it('leaves a missing path and a bad id to the other rules', () => {
    const ext = looseExtension() as unknown as Record<string, unknown>;
    ext.navigation = [{ label: 'x' }];
    expect(validateExtension(ext).errors).not.toContainEqual(
      expect.stringContaining('must be under'),
    );
  });
});
