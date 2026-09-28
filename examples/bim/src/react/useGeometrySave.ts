/**
 * Storing geometry converted in the browser, so the model is not converted
 * again on the next visit, and saying where that stands.
 *
 * A large model goes up in dozens of pieces. Without a word while it happens,
 * a person who looked at the menu meanwhile saw the model still marked as
 * unconverted and concluded the save had failed.
 */

import { useCallback } from 'react';
import type { BimModel } from 'src/react/assets';
import { useResetOn } from 'src/react/useResetOn';

export type SaveState = 'idle' | 'saving' | 'stored' | 'failed';

export type PersistGeometry = (
  model: BimModel,
  glb: Uint8Array,
) => Promise<void>;

export interface GeometrySave {
  /** Where the chosen model's save stands. */
  save: SaveState;
  /** Absent when the host stores nothing, so the canvas never exports. */
  onConverted?: (glb: Uint8Array) => void;
}

/** A save, tagged with the model it was made for. */
interface Saved {
  model: BimModel | null;
  state: SaveState;
}

const IDLE: Saved = { model: null, state: 'idle' };

/** Hand one conversion to the host, marking each step on `mark`. */
function persist(
  model: BimModel,
  glb: Uint8Array,
  onPersistGeometry: PersistGeometry,
  { mark, reload }: { mark: (state: SaveState) => void; reload: () => void },
) {
  mark('saving');
  onPersistGeometry(model, glb)
    .then(() => {
      mark('stored');
      reload();
    })
    .catch(() => mark('failed'));
}

/**
 * The save of the chosen model.
 *
 * A save belongs to the model it was made for. Choosing a model, even one
 * chosen before, starts it at `idle`, and a save that finishes after the
 * choice has moved on is not shown for the model now on screen. Once stored, `reload` lists the folder again, so the new GLB is paired
 * with its model and it reads as converted. A refused store is only reported:
 * the drawing on screen is unaffected, and the model reconverts next time.
 */
export function useGeometrySave(
  chosen: BimModel | null,
  onPersistGeometry: PersistGeometry | undefined,
  reload: () => void,
): GeometrySave {
  const [saved, setSaved] = useResetOn<Saved>(chosen, IDLE);

  const onConverted = useCallback(
    (glb: Uint8Array) => {
      if (!chosen || !onPersistGeometry) return;
      const mark = (state: SaveState) => setSaved({ model: chosen, state });
      persist(chosen, glb, onPersistGeometry, { mark, reload });
    },
    [chosen, onPersistGeometry, reload, setSaved],
  );

  return {
    save: saved.model === chosen ? saved.state : 'idle',
    onConverted: onPersistGeometry ? onConverted : undefined,
  };
}

export default useGeometrySave;
