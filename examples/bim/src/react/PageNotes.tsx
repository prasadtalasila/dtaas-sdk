/**
 * What the page says above the drawing: what failed, and notes about the
 * model on screen that a person can close.
 */

import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  CircularProgress,
  type AlertColor,
} from '@mui/material';
import type { BimModel } from 'src/react/assets';
import type { Problem } from 'src/react/libraryJson';
import type { SaveState } from 'src/react/useGeometrySave';

const SAVING =
  'Saving the conversion to the library, so the next visit loads it instead ' +
  'of converting again. A large model takes a moment.';

const STORED =
  'Stored in the library. The next visit loads this model without converting it.';

const NOT_STORED =
  'The conversion could not be stored, so this model will convert again next time.';

const CONVERTS_HERE =
  'No converted geometry sits beside this model, so it is read from the IFC ' +
  'file in your browser. That takes a moment the first time.';

/**
 * The headline says what failed, which is the part a person acts on. The
 * address and the likely cause follow it.
 */
export function ProblemAlert({
  problem,
}: Readonly<{ problem: Problem | null }>) {
  if (!problem) return null;
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <AlertTitle>{problem.summary}</AlertTitle>
      {problem.detail}
    </Alert>
  );
}

/** The host selected a model the folder does not hold. */
export function MissingModel({
  name,
  directory,
}: Readonly<{ name: string; directory: string }>) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      {`No model named ${name} in ${directory}`}
    </Alert>
  );
}

/**
 * Notes a person has closed, held by their text instead of by a position.
 * Choosing another model produces a different sentence, which then shows
 * again, and choosing the same one back does not repeat what was dismissed.
 */
function useDismissed() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = (text: string) =>
    setDismissed((seen) => new Set(seen).add(text));
  return { dismissed, dismiss };
}

type Dismissed = ReturnType<typeof useDismissed>;

function closable(
  text: string | null,
  severity: AlertColor,
  { dismissed, dismiss }: Dismissed,
) {
  if (!text || dismissed.has(text)) return null;
  return (
    <Alert severity={severity} sx={{ mb: 2 }} onClose={() => dismiss(text)}>
      {text}
    </Alert>
  );
}

export interface ModelNotesProps {
  /** The chosen model as the latest listing describes it. */
  current: BimModel | null;
  save: SaveState;
  /** What the canvas last reported about the model. */
  note: string | null;
}

export function ModelNotes({ current, save, note }: Readonly<ModelNotesProps>) {
  const notes = useDismissed();
  const convertsHere = current !== null && !current.geometryPath;
  return (
    <>
      {closable(convertsHere ? CONVERTS_HERE : null, 'info', notes)}
      {save === 'saving' && (
        <Alert
          severity="info"
          icon={<CircularProgress size={18} />}
          sx={{ mb: 2 }}
        >
          {SAVING}
        </Alert>
      )}
      {closable(save === 'stored' ? STORED : null, 'success', notes)}
      {closable(save === 'failed' ? NOT_STORED : null, 'warning', notes)}
      {closable(note, 'info', notes)}
    </>
  );
}
