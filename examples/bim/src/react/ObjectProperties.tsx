/**
 * The property sets a model carries for the selected object, behind a
 * dialog.
 *
 * These are everything the authoring tool exported, and there is a lot of
 * it: a family and type, its construction and wrapping, its fire and
 * acoustic marks, the standard IFC sets such as `Pset_WallCommon`. All of it
 * is kept and none of it is thrown away, because a person asking about a
 * wall's U-value has nowhere else to look. It sits behind a dialog and not on
 * the panel, because sixty rows under a click is not an answer, it is a
 * haystack.
 */

import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/** A row of a property table, skipped when there is nothing to say. */
export function Row({
  name,
  value,
}: Readonly<{ name: string; value: unknown }>) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <TableRow>
      <TableCell
        sx={{ width: 160, color: 'text.secondary', border: 0, py: 0.3 }}
      >
        {name}
      </TableCell>
      <TableCell sx={{ border: 0, py: 0.3, wordBreak: 'break-word' }}>
        {String(value)}
      </TableCell>
    </TableRow>
  );
}

function PropertySets(
  props: Readonly<{ sets: Array<[string, Record<string, unknown>]> }>,
) {
  const { sets } = props;
  return (
    <Stack spacing={1}>
      {sets.map(([setName, values]) => (
        <Paper key={setName} variant="outlined" sx={{ p: 1.5 }}>
          <Box sx={{ mb: 0.5 }}>
            <Chip size="small" label={setName} />
          </Box>
          <Table size="small">
            <TableBody>
              {Object.entries(values).map(([key, value]) => (
                <Row key={key} name={key} value={value} />
              ))}
            </TableBody>
          </Table>
        </Paper>
      ))}
    </Stack>
  );
}

export interface PropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sets: Array<[string, Record<string, unknown>]>;
}

const DIALOG_SHAPE = {
  fullWidth: true,
  maxWidth: 'md' as const,
  scroll: 'paper' as const,
};
const CLOSE_BUTTON_SX = { position: 'absolute' as const, right: 8, top: 8 };

export function PropertiesDialog(props: Readonly<PropertiesDialogProps>) {
  const { open, onClose, title, sets } = props;
  return (
    <Dialog open={open} onClose={onClose} {...DIALOG_SHAPE}>
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="Close" onClick={onClose} sx={CLOSE_BUTTON_SX}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <PropertySets sets={sets} />
      </DialogContent>
    </Dialog>
  );
}
