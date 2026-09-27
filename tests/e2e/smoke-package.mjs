// Packs the built package, checks the tarball, installs it with its peers in a
// clean project, then imports every subpath and type-checks a consumer.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PEERS = [
  'react@19.2.0',
  'react-dom@19.2.0',
  'zod@4.4.3',
  'react-router-dom@7.18.1',
  '@testing-library/react@16.3.0',
  '@testing-library/dom@10.4.0',
  'eslint@9.39.5',
];

const ALLOWED =
  /^package\/(package\.json|README\.md|LICENSE\.md|CHANGELOG\.md|dist\/.+\.(js|d\.ts))$/;
const REQUIRED = [
  'index',
  'schema/index',
  'testing/index',
  'eslint/index',
].flatMap((entry) => [
  `package/dist/${entry}.js`,
  `package/dist/${entry}.d.ts`,
]);

// Argument arrays, no shell; output stays visible so failures are easy to diagnose.
const yarn = (args, cwd) =>
  execFileSync('yarn', args, { cwd, stdio: 'inherit' });

const packageName = () => JSON.parse(readFileSync('package.json', 'utf8')).name;

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

const importScript = (name) => `
import assert from 'node:assert/strict';
const root = await import('${name}');
assert.equal(root.SDK_MAJOR, 1);
assert.equal(root.validateExtension({}).valid, false);
const schema = await import('${name}/schema');
const junction7 = ${readFileSync('tests/fixtures/junction7.visualisation.json', 'utf8')};
assert.equal(schema.parseVisualisationAsset(junction7).success, true);
const testing = await import('${name}/testing');
assert.equal(typeof testing.checkConformance, 'function');
const host = testing.fakeHostServices();
host.ui.snackbar('ok', 'info');
assert.equal(host.recorded.snackbars.length, 1);
const eslint = await import('${name}/eslint');
assert.ok(Array.isArray(eslint.default));
`;

const consumerSource = (name) => `
import { defineExtension, type HostServices } from '${name}';
import { encodingSchema } from '${name}/schema';
import type { FakeHostServices } from '${name}/testing';
import kitConfig from '${name}/eslint';
const ext = defineExtension({ id: 'smoke', name: 'Smoke', version: '1.0.0', sdk: 1 });
const useHostType = (host: HostServices, fake: FakeHostServices) => [host, fake];
export default [ext, encodingSchema, kitConfig, useHostType];
`;

const typeCheckConsumer = (directory, name) => {
  writeFileSync(join(directory, 'consumer.ts'), consumerSource(name));
  const tsc = resolve('node_modules/typescript/bin/tsc');
  execFileSync(
    process.execPath,
    [
      tsc,
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2019',
      '--jsx',
      'react-jsx',
      '--types',
      'react',
      '--typeRoots',
      resolve('node_modules/@types'),
      'consumer.ts',
    ],
    { cwd: directory, stdio: 'inherit' },
  );
};

const runSmokeTest = () => {
  const directory = mkdtempSync(join(tmpdir(), 'dtaas-sdk-smoke-'));
  const archive = join(directory, 'package.tgz');
  try {
    yarn(['pack', '--filename', archive], process.cwd());
    checkTarball(archive);
    yarn(['init', '-y'], directory);
    yarn(['add', '--silent', `file:${archive}`, ...PEERS], directory);
    execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', importScript(packageName())],
      {
        cwd: directory,
        stdio: 'inherit',
      },
    );
    typeCheckConsumer(directory, packageName());
    process.stdout.write('Package smoke test passed\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

runSmokeTest();
