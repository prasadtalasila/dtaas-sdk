// Builds and packs the SDK at the repository root, then unpacks the tarball
// where Node resolves the peer. A `file:` dependency would copy the whole
// repository (a second React) or fail yarn's integrity check on every rebuild.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const target = resolve(
  import.meta.dirname,
  '../node_modules/@into-cps-association/dtaas-sdk',
);
const work = mkdtempSync(join(tmpdir(), 'dtaas-sdk-'));
const tarball = join(work, 'sdk.tgz');
const run = (command, args) =>
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });

try {
  run('yarn', ['build']);
  run('yarn', ['pack', '--filename', tarball]);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  run('tar', ['-xzf', tarball, '-C', target, '--strip-components=1']);
} finally {
  rmSync(work, { recursive: true, force: true });
}
