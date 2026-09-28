/**
 * The building models page.
 *
 * A person uploads an IFC file to a folder of their library. This lists what
 * is there and draws it. An IFC file cannot be drawn as it stands, and
 * conversion leaves a GLB beside the source, so a model here is in one of two
 * states, and the page says which instead of showing an empty canvas.
 *
 * Nothing here imports the application that mounts it. The host passes in
 * what only it knows: the URL of the user's library and the folder to list,
 * and optionally how to list it, which model to show, and how to store a
 * conversion. It keeps its own layout, route guard and auth.
 */

import { Box } from '@mui/material';
import type { Binding, FeedState, Reading } from 'src/core';
import { HelpPanel } from 'src/react/HelpPanel';
import { ModelChooser } from 'src/react/ModelPicker';
import { ModelView } from 'src/react/ModelView';
import { MissingModel, ModelNotes, ProblemAlert } from 'src/react/PageNotes';
import type { BimModel, LibraryEntry } from 'src/react/assets';
import { useBuildingModels, type Page } from 'src/react/useBuildingModels';

export interface BuildingModelsProps {
  /**
   * Where the user's library is served from, ending in the user name, as in
   * `https://host/jane/`. The host knows this and the package cannot.
   */
  libraryUrl: string;
  /** Library folder holding the models; the host or the user chooses it. */
  directory: string;
  /**
   * The last value received for each object, keyed by GlobalId. Pushed in
   * instead of fetched, so a broker, a database or a test all look the same.
   */
  readings?: Map<string, Reading>;
  /** Whether the transport is connected, which no age can tell on its own. */
  feed?: FeedState;
  /**
   * Store the geometry converted in the browser, so the model is not
   * reconverted on the next visit. Resolving means it was stored, and the
   * folder is listed again so the model reads as converted. A rejection is
   * reported and otherwise ignored. Absent, conversions are not stored.
   */
  onPersistGeometry?: (model: BimModel, glb: Uint8Array) => Promise<void>;
  /** Lists `directory`; absent → fetch `contentsUrl(libraryUrl, directory)`. */
  list?: (directory: string) => Promise<LibraryEntry[]>;
  /** Model stem to show; absent → uncontrolled, as bim-kit 0.1.1. */
  selected?: string;
  /** Called when the person picks a model. */
  onSelect?: (name: string) => void;
  /** Called with the chosen model's bindings whenever they change. */
  onBindingsChange?: (bindings: Binding[]) => void;
}

/** Page-wide styles. `minWidth: 0` stops a wide canvas pushing the page sideways. */
const PAGE_SX = {
  width: '100%',
  minWidth: 0,
  flexGrow: 1,
  p: 3,
  overflowX: 'hidden',
} as const;

interface PageHeaderProps {
  page: Page;
  directory: string;
  selected?: string;
}

/** What failed, the menu, and the notes about the model on screen. */
function PageHeader({ page, directory, selected }: Readonly<PageHeaderProps>) {
  const { listing, selection } = page;
  return (
    <>
      <ProblemAlert problem={listing.problem ?? page.files.problem} />
      <Box sx={{ mb: 3 }}>
        <ModelChooser
          models={listing.models}
          chosen={selection.chosen}
          onChoose={selection.choose}
        />
      </Box>
      {selection.missing && (
        <MissingModel name={selected ?? ''} directory={directory} />
      )}
      <ModelNotes
        current={selection.current}
        save={page.saving.save}
        note={page.note}
      />
    </>
  );
}

export function BuildingModels(props: Readonly<BuildingModelsProps>) {
  const page = useBuildingModels(props);
  const { chosen } = page.selection;
  return (
    <Box sx={PAGE_SX}>
      <PageHeader
        page={page}
        directory={props.directory}
        selected={props.selected}
      />
      {chosen && (
        <ModelView libraryUrl={props.libraryUrl} chosen={chosen} page={page} />
      )}
      <HelpPanel open={page.viewer.helpOpen} onClose={page.viewer.closeHelp} />
    </Box>
  );
}

export default BuildingModels;
