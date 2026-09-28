/**
 * Everything the building models page holds, gathered from the hooks that
 * each own one part of it.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Binding, FeedState, Reading } from 'src/core';
import type { BimModel } from 'src/react/assets';
import { useChosenModel, type ChosenModel } from 'src/react/useChosenModel';
import { useGeometrySave, type GeometrySave } from 'src/react/useGeometrySave';
import { useModelFiles, type ModelFiles } from 'src/react/useModelFiles';
import { useModelList, type ModelList } from 'src/react/useModelList';
import { useResetOn } from 'src/react/useResetOn';
import { useViewer, type Viewer } from 'src/react/useViewer';
import type { BuildingModelsProps } from 'src/react/BuildingModels';
import type { Live } from 'src/react/ViewerPanels';

export interface Page {
  listing: ModelList;
  selection: ChosenModel;
  files: ModelFiles;
  saving: GeometrySave;
  /** What the canvas last reported about the chosen model. */
  note: string | null;
  onReport: (message: string) => void;
  live: Live;
  viewer: Viewer;
}

/**
 * The readings a host that passes none gets, shared by every render.
 *
 * A default of `new Map()` made a new map on every render, and the effect
 * that applies readings depends on it and repaints, which rendered again:
 * the page repainted the model without end.
 */
const NO_READINGS = new Map<string, Reading>();
const NO_FEED: FeedState = 'down';

/**
 * The canvas's last report. It belongs to the model it was made for, and
 * choosing a model starts it afresh, as a new canvas reports again.
 */
function useReport(chosen: BimModel | null) {
  const [report, setReport] = useResetOn<{
    model: BimModel | null;
    text: string;
  } | null>(chosen, null);
  const onReport = useCallback(
    (text: string) => setReport({ model: chosen, text }),
    [chosen, setReport],
  );
  return { note: report?.model === chosen ? report.text : null, onReport };
}

/**
 * Tell the host the bindings in force whenever they change. The callback is
 * read when they change, so a new function on every host render is harmless.
 */
function useBindingsReport(
  bindings: Binding[],
  onBindingsChange: ((bindings: Binding[]) => void) | undefined,
) {
  const listener = useRef(onBindingsChange);
  useEffect(() => {
    listener.current = onBindingsChange;
  });
  useEffect(() => {
    listener.current?.(bindings);
  }, [bindings]);
}

export function useBuildingModels(props: Readonly<BuildingModelsProps>): Page {
  const { libraryUrl, directory, selected, onSelect } = props;
  const listing = useModelList(libraryUrl, directory, props.list);
  const { models } = listing;
  const selection = useChosenModel({ models, directory, selected, onSelect });
  const { chosen } = selection;
  const files = useModelFiles(libraryUrl, chosen);
  const saving = useGeometrySave(
    chosen,
    props.onPersistGeometry,
    listing.reload,
  );
  const { note, onReport } = useReport(chosen);
  useBindingsReport(files.bindings, props.onBindingsChange);
  const readings = props.readings ?? NO_READINGS;
  const live = {
    bindings: files.bindings,
    readings,
    feed: props.feed ?? NO_FEED,
  };
  const viewer = useViewer(live);
  return { listing, selection, files, saving, note, onReport, live, viewer };
}

export default useBuildingModels;
