import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { normaliseLibraryPath } from 'src/core';
import { BIM_ROOT } from 'src/dtaas/ids';

export interface ModelRoute {
  /** Folder to show, or `null` when `?dir=` could leave the library. */
  readonly directory: string | null;
  /** The raw `?dir=` value when it was rejected. */
  readonly rejected?: string;
  readonly model?: string;
  selectModel(name: string): void;
  selectDirectory(path: string): void;
}

/** `/` stays readable in the query; everything else is encoded. */
const withDir = (path: string, directory: string) =>
  `${path}?dir=${encodeURIComponent(directory).replace(/%2F/g, '/')}`;

/** The two navigation actions, kept out of `useModelRoute` for its line limit. */
const useSelectors = (directory: string | null) => {
  const navigate = useNavigate();
  const selectModel = useCallback(
    (name: string) => {
      if (directory !== null) {
        navigate(
          withDir(`${BIM_ROOT}/models/${encodeURIComponent(name)}`, directory),
        );
      }
    },
    [directory, navigate],
  );
  const selectDirectory = useCallback(
    (path: string) => navigate(withDir(BIM_ROOT, path)),
    [navigate],
  );
  return { selectModel, selectDirectory };
};

const useModelRoute = (fallback: string): ModelRoute => {
  const { model } = useParams();
  const [search] = useSearchParams();
  const raw = search.get('dir') || fallback;
  const directory = normaliseLibraryPath(raw);
  const { selectModel, selectDirectory } = useSelectors(directory);
  return {
    directory,
    rejected: directory === null ? raw : undefined,
    model,
    selectModel,
    selectDirectory,
  };
};

export default useModelRoute;
