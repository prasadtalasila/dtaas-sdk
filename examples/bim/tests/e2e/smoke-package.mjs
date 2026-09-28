// Packs the built bim package and the SDK root (its peer) to temp tarballs,
// checks the bim tarball's contents, installs both plus peers in a clean
// project, then imports every subpath. Modelled on the root
// tests/e2e/smoke-package.mjs, without the TypeScript consumer check: the
// bim package's contract is exercised structurally, not through its types.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PEERS = [
  'react@19.2.0',
  'react-dom@19.2.0',
  'zod@4.4.3',
  'three@0.186.0',
  'web-ifc@0.0.77',
  '@mui/material@9.4.0',
  '@mui/icons-material@9.4.0',
  '@emotion/react@11.14.0',
  '@emotion/styled@11.14.1',
];

const ALLOWED =
  /^package\/(package\.json|README\.md|LICENSE\.md|CHANGELOG\.md|THIRD-PARTY-NOTICES\.md|dist\/.+\.(js|d\.ts))$/;

const ENTRIES = [
  'core/index',
  'schema/index',
  'converter/index',
  'viewer/index',
  'react/index',
  'react/BimCanvas',
  'dtaas/index',
];

const REQUIRED = [
  ...['README.md', 'LICENSE.md', 'CHANGELOG.md', 'THIRD-PARTY-NOTICES.md'].map(
    (file) => `package/${file}`,
  ),
  ...ENTRIES.flatMap((entry) => [
    `package/dist/${entry}.js`,
    `package/dist/${entry}.d.ts`,
  ]),
];

// Argument arrays, no shell; output stays visible so failures are easy to diagnose.
const yarn = (args, cwd) =>
  execFileSync('yarn', args, { cwd, stdio: 'inherit' });

const packageName = (directory) =>
  JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).name;

const checkTarball = (archive) => {
  // Regular files only: their verbose listing starts with '-'.
  const files = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.startsWith('-'))
    .map((line) => line.split(/\s+/).pop());
  const unexpected = files.filter((file) => !ALLOWED.test(file));
  const missing = REQUIRED.filter((file) => !files.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(
      `Tarball check failed. Unexpected: ${unexpected.join(', ') || 'none'}. Missing: ${missing.join(', ') || 'none'}.`,
    );
  }
};

// Each subpath's most telling export, plus the dtaas extension validated
// through the real SDK rather than a hand-rolled shape check.
const importScript = (bimName, sdkName) => `
import assert from 'node:assert/strict';
const core = await import('${bimName}');
assert.equal(core.normaliseLibraryPath('a/../b'), null);
const schema = await import('${bimName}/schema');
assert.equal(schema.readManifest({}).ok, false);
const converter = await import('${bimName}/converter');
assert.equal(typeof converter.convertIfc, 'function');
const viewer = await import('${bimName}/viewer');
assert.equal(typeof viewer.SceneView, 'function');
const react = await import('${bimName}/react');
assert.equal(typeof react.BuildingModels, 'function');
const canvas = await import('${bimName}/react/canvas');
assert.equal(typeof canvas.default, 'function');
const dtaas = await import('${bimName}/dtaas');
assert.equal(dtaas.extension.id, 'bim');
const sdk = await import('${sdkName}');
assert.equal(sdk.validateExtension(dtaas.extension).valid, true);
`;

const packTo = (sourceDirectory, directory, name) => {
  const archive = join(directory, `${name}.tgz`);
  yarn(['pack', '--filename', archive], sourceDirectory);
  return archive;
};

const installEverything = (directory, bimArchive, sdkArchive) => {
  yarn(['init', '-y'], directory);
  yarn(
    ['add', '--silent', `file:${bimArchive}`, `file:${sdkArchive}`, ...PEERS],
    directory,
  );
};

const runSmokeTest = () => {
  const bimRoot = process.cwd();
  const sdkRoot = resolve(bimRoot, '..', '..');
  const directory = mkdtempSync(join(tmpdir(), 'bim-example-smoke-'));
  try {
    const bimArchive = packTo(bimRoot, directory, 'bim');
    checkTarball(bimArchive);
    const sdkArchive = packTo(sdkRoot, directory, 'sdk');
    installEverything(directory, bimArchive, sdkArchive);
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        importScript(packageName(bimRoot), packageName(sdkRoot)),
      ],
      { cwd: directory, stdio: 'inherit' },
    );
    process.stdout.write('Package smoke test passed\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

runSmokeTest();
