import { useCallback, useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useHost } from '@into-cps-association/dtaas-sdk';
import { normaliseLibraryPath, type Binding } from 'src/core';
import type { LibraryEntry } from 'src/react/assets';
import { BuildingModels, DirectoryPicker } from 'src/react';
import configSchema from 'src/dtaas/config';
import persistGeometry from 'src/dtaas/persistGeometry';
import useModelRoute, { type ModelRoute } from 'src/dtaas/useModelRoute';
import useReadings from 'src/dtaas/useReadings';

const useFallbackDirectory = () => {
  const host = useHost();
  return useMemo(
    () =>
      host.config(configSchema).modelsDirectory ??
      host.library.conventions.modelsDirectory,
    [host],
  );
};

/** `host.contents.list`, called as a method so a class-based host keeps `this`. */
const useList = () => {
  const host = useHost();
  return useCallback((path: string) => host.contents.list(path), [host]);
};

interface PanelProps {
  readonly route: ModelRoute;
  readonly directory: string;
  readonly list: (path: string) => Promise<LibraryEntry[]>;
}

/** The models panel: readings, bindings and geometry persistence, wired to the host. */
function ModelsPanel({ route, directory, list }: Readonly<PanelProps>) {
  const host = useHost();
  const libraryUrl = host.library.useBaseUrl();
  const [bindings, setBindings] = useState<Binding[]>([]);
  const { readings, feed } = useReadings(host.signals, bindings);
  const onPersistGeometry = useMemo(
    () => persistGeometry(host, directory),
    [host, directory],
  );
  if (!libraryUrl) return null;
  return (
    <BuildingModels
      libraryUrl={libraryUrl}
      directory={directory}
      list={list}
      selected={route.model}
      onSelect={route.selectModel}
      onBindingsChange={setBindings}
      readings={readings}
      feed={feed}
      onPersistGeometry={onPersistGeometry}
    />
  );
}

/** The folder picker and the models panel, once a valid directory is known. */
function BuildingsView(props: Readonly<PanelProps>) {
  const { route, directory, list } = props;
  return (
    <Stack spacing={2}>
      <DirectoryPicker
        list={list}
        value={directory}
        onChange={route.selectDirectory}
      />
      <ModelsPanel {...props} />
    </Stack>
  );
}

/**
 * A `?dir=` that could leave the library, said, with the fallback folder in
 * the picker so a person can move on to a valid one, or the library root
 * when the fallback is rejected too. Nothing is listed for a rejected path.
 */
function RejectedFolder({ route, directory, list }: Readonly<PanelProps>) {
  return (
    <Stack spacing={2}>
      <Alert severity="error">
        &quot;{route.rejected}&quot; is not a folder in your library.
      </Alert>
      <DirectoryPicker
        list={list}
        value={directory}
        onChange={route.selectDirectory}
      />
    </Stack>
  );
}

const BuildingsPage = () => {
  const host = useHost();
  const fallback = useFallbackDirectory();
  const route = useModelRoute(fallback);
  const list = useList();
  const { Page } = host.ui;
  const { directory } = route;
  return (
    <Page title="Buildings">
      {directory === null ? (
        <RejectedFolder
          route={route}
          directory={normaliseLibraryPath(fallback) ?? ''}
          list={list}
        />
      ) : (
        <BuildingsView route={route} directory={directory} list={list} />
      )}
    </Page>
  );
};

export default BuildingsPage;
