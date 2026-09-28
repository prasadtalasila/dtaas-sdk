/**
 * The files beside the chosen model: its property tree and its manifest.
 *
 * Each answer is kept with the model it was read for, so switching to a model
 * without one never shows the last model's tree or sensors, and nothing has
 * to be cleared when the choice changes.
 */

import { useEffect, useState } from 'react';
import type { Binding } from 'src/core';
import type { PropertyTree } from 'src/viewer';
import { fileUrl, type BimModel } from 'src/react/assets';
import { fetchJson, messageOf, type Problem } from 'src/react/libraryJson';

export interface ModelFiles {
  tree: PropertyTree | null;
  bindings: Binding[];
  /** The manifest marks its placements as proposed by a tool, not surveyed. */
  proposed: boolean;
  problem: Problem | null;
}

interface Manifest {
  bindings?: Binding[];
  model?: { proposed?: boolean };
}

type Sidecar = Omit<ModelFiles, 'tree'>;

const NO_BINDINGS: Binding[] = [];
const NO_MANIFEST: Sidecar = {
  bindings: NO_BINDINGS,
  proposed: false,
  problem: null,
};

/**
 * Read the JSON file at `path` into `keep`, until the returned function runs.
 * Nothing is read, and `undefined` returned, when there is no such file.
 */
function readBeside<T>(
  libraryUrl: string,
  path: string | undefined,
  keep: (value: T) => void,
  fail: (error: unknown) => void,
): (() => void) | undefined {
  if (!path || !libraryUrl) return undefined;
  let current = true;
  fetchJson<T>(fileUrl(libraryUrl, path))
    .then((value) => current && keep(value))
    .catch((error: unknown) => current && fail(error));
  return () => {
    current = false;
  };
}

/**
 * The property tree, which says which storey and which room each object is
 * in. A model with no tree, or one that cannot be read, still draws: the
 * floor filter and the heatmap just have nothing to group by.
 */
function useTree(libraryUrl: string, chosen: BimModel | null) {
  const [read, setRead] = useState<{
    model: BimModel | null;
    tree: PropertyTree | null;
  }>({ model: null, tree: null });

  useEffect(
    () =>
      readBeside<PropertyTree>(
        libraryUrl,
        chosen?.treePath,
        (tree) => setRead({ model: chosen, tree }),
        () => {},
      ),
    [chosen, libraryUrl],
  );
  return read.model === chosen ? read.tree : null;
}

type ManifestRead = { model: BimModel | null } & Sidecar;

function manifestOf(model: BimModel | null, manifest: Manifest): ManifestRead {
  return {
    model,
    bindings: manifest.bindings ?? NO_BINDINGS,
    proposed: manifest.model?.proposed === true,
    problem: null,
  };
}

function unreadManifest(model: BimModel | null, error: unknown): ManifestRead {
  const summary = 'The sensor manifest could not be read.';
  return {
    model,
    ...NO_MANIFEST,
    problem: { summary, detail: messageOf(error) },
  };
}

/** The manifest. Most models declare no sensors, and have no manifest. */
function useManifest(libraryUrl: string, chosen: BimModel | null): Sidecar {
  const [read, setRead] = useState<ManifestRead>({
    model: null,
    ...NO_MANIFEST,
  });

  useEffect(
    () =>
      readBeside<Manifest>(
        libraryUrl,
        chosen?.manifestPath,
        (manifest) => setRead(manifestOf(chosen, manifest)),
        (error) => setRead(unreadManifest(chosen, error)),
      ),
    [chosen, libraryUrl],
  );

  if (read.model !== chosen) return NO_MANIFEST;
  const { bindings, proposed, problem } = read;
  return { bindings, proposed, problem };
}

export function useModelFiles(
  libraryUrl: string,
  chosen: BimModel | null,
): ModelFiles {
  const tree = useTree(libraryUrl, chosen);
  return { tree, ...useManifest(libraryUrl, chosen) };
}

export default useModelFiles;
