// Node ESM consumers (moduleResolution node16/nodenext) need explicit file
// paths in declaration files. tsc-alias cannot add them because tsup bundles
// the JavaScript, so `./x.js` never exists next to `./x.d.ts`. This rewrites
// `./x` to `./x.js` or `./x/index.js` after the declaration build.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const RELATIVE_SPECIFIER = /(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g;

const declarations = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return declarations(path);
    return entry.name.endsWith('.d.ts') ? [path] : [];
  });

const fullPath = (file, specifier) => {
  if (specifier.endsWith('.js')) return specifier;
  const base = resolve(dirname(file), specifier);
  if (existsSync(`${base}.d.ts`)) return `${specifier}.js`;
  if (existsSync(join(base, 'index.d.ts'))) return `${specifier}/index.js`;
  throw new Error(`${file}: cannot resolve declaration import "${specifier}"`);
};

declarations(resolve(process.argv[2] ?? 'dist')).forEach((file) => {
  const source = readFileSync(file, 'utf8');
  const rewritten = source.replace(
    RELATIVE_SPECIFIER,
    (_, prefix, quote, specifier) =>
      `${prefix}${quote}${fullPath(file, specifier)}${quote}`,
  );
  if (rewritten !== source) writeFileSync(file, rewritten);
});
