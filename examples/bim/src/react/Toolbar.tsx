/**
 * The toolbar, generated from the shortcut table.
 *
 * Every button here is one entry of that table, so a button and a key cannot
 * disagree and adding a shortcut adds a button. Each button prints its key,
 * which is how a person learns the shortcut without reading a list.
 *
 * A toggle that is on is filled and says what it is set to. An entry with no
 * `on` is an action and never lights up, because a button that looks pressed
 * while nothing is switched on is a lie about the state of the model.
 */

import { Box, Chip, Stack, ToggleButton, Tooltip } from '@mui/material';
import {
  SHORTCUTS,
  type SceneView,
  type Shortcut,
  type ShortcutContext,
} from 'src/viewer';
import { iconFor } from 'src/react/icons';

export interface ToolbarProps {
  view: SceneView;
  /** Everything a shortcut needs to do its work, supplied by the page. */
  context: ShortcutContext;
  /** Bumped by the page after any change, so the buttons redraw. */
  revision: number;
}

interface ShortcutButtonProps {
  shortcut: Shortcut;
  view: SceneView;
  context: ShortcutContext;
}

function ShortcutButton(props: Readonly<ShortcutButtonProps>) {
  const { shortcut, view, context } = props;
  const on = shortcut.on?.(view) ?? false;
  const badge = shortcut.badge?.(view);

  return (
    <Tooltip title={`${shortcut.label}  (${shortcut.key})`}>
      <ToggleButton
        value={shortcut.key}
        selected={on}
        size="small"
        onChange={() => shortcut.run(context)}
        aria-label={shortcut.label}
        sx={{ gap: 0.5, textTransform: 'none' }}
      >
        {iconFor(shortcut.icon)}
        <Box component="span" sx={{ fontSize: 11, opacity: 0.7 }}>
          {shortcut.key}
        </Box>
        {on && badge && <Chip size="small" label={badge} sx={{ height: 18 }} />}
      </ToggleButton>
    </Tooltip>
  );
}

export function Toolbar({ view, context, revision }: Readonly<ToolbarProps>) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}
      data-revision={revision}
    >
      {SHORTCUTS.map((shortcut) => (
        <ShortcutButton
          key={shortcut.key}
          shortcut={shortcut}
          view={view}
          context={context}
        />
      ))}
    </Stack>
  );
}

export default Toolbar;
