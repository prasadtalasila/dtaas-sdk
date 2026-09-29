import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useHost } from '@into-cps-association/dtaas-sdk';
import type { Binding } from 'src/core';
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

interface PanelProps {
  readonly route: ModelRoute;
  readonly directory: string;
}

/** The models panel: readings, bindings and geometry persistence, wired to the host. */
function ModelsPanel({ route, directory }: Readonly<PanelProps>) {
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
      list={host.contents.list}
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
function BuildingsView({ route, directory }: Readonly<PanelProps>) {
  const host = useHost();
  return (
    <Stack spacing={2}>
      <DirectoryPicker
        list={host.contents.list}
        value={directory}
        onChange={route.selectDirectory}
      />
      <ModelsPanel route={route} directory={directory} />
    </Stack>
  );
}

const BuildingsPage = () => {
  const host = useHost();
  const route = useModelRoute(useFallbackDirectory());
  const { Page } = host.ui;
  const { directory } = route;
  if (directory === null) {
    return (
      <Page title="Buildings">
        <Alert severity="error">
          &quot;{route.rejected}&quot; is not a folder in your library.
        </Alert>
      </Page>
    );
  }
  return (
    <Page title="Buildings">
      <BuildingsView route={route} directory={directory} />
    </Page>
  );
};

export default BuildingsPage;
