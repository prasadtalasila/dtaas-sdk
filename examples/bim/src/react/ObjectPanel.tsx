/**
 * What the selected object is.
 *
 * The point of binding a sensor to a model element is that clicking the
 * element says what it is. Without this a viewer is a picture: a person can
 * see a wall is coloured and cannot find out which wall.
 *
 * Everything drawn here comes from the model or from a manifest, and both
 * are untrusted input as far as this is concerned. React escapes text by
 * default and nothing here uses `dangerouslySetInnerHTML`.
 */

import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  Typography,
} from '@mui/material';
import { displayOf, idOf, topicOf, type Binding } from 'src/core/binding';
import type { ObjectFacts } from 'src/viewer';
import { PropertiesDialog, Row } from 'src/react/ObjectProperties';

export interface ObjectPanelProps {
  globalId: string | null;
  facts: ObjectFacts | undefined;
  /** The binding attached to this object, when one is. */
  binding: Binding | undefined;
  /**
   * The property sets the model carries for it, when the tree has them.
   *
   * All of it is kept and none of it is thrown away, because a person asking
   * about a wall's U-value has nowhere else to look. It is behind a button
   * instead of on the panel because sixty rows under a click is not an
   * answer, it is a haystack.
   */
  properties?: Record<string, Record<string, unknown>>;
  /** Its extent in metres along each world axis, measured from the geometry. */
  size?: { x: number; y: number; z: number };
}

/**
 * A size in metres, or in millimetres when metres would read as zero.
 *
 * A door handle 40 mm across is "0.0 m" at one decimal, which says nothing.
 */
function metres(size: { x: number; y: number; z: number }): string {
  const parts = [size.x, size.y, size.z];
  if (Math.max(...parts) < 0.5) {
    return `${parts.map((n) => Math.round(n * 1000)).join(' × ')} mm`;
  }
  return `${parts.map((n) => n.toFixed(2)).join(' × ')} m`;
}

/** The rows a bound sensor adds, or nothing when the object has none. */
function BindingRows({ binding }: Readonly<{ binding: Binding | undefined }>) {
  if (!binding) return null;
  return (
    <>
      <Row name="Sensor" value={idOf(binding)} />
      <Row name="Unit" value={displayOf(binding).unit} />
      <Row name="MQTT Topic" value={topicOf(binding)} />
    </>
  );
}

interface FactsTableProps {
  globalId: string;
  facts: ObjectFacts | undefined;
  binding: Binding | undefined;
  size: { x: number; y: number; z: number } | undefined;
}

function FactsTable(props: Readonly<FactsTableProps>) {
  const { globalId, facts, binding, size } = props;
  // IFC writes NOTDEFINED when the exporter said nothing, which is not a type and is worth no row.
  const predefinedType =
    facts?.predefinedType === 'NOTDEFINED' ? undefined : facts?.predefinedType;
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Table size="small">
        <TableBody>
          <Row name="Name" value={facts?.name} />
          <Row name="IFC Class" value={facts?.ifcClass} />
          <Row name="Predefined Type" value={predefinedType} />
          <Row name="Storey" value={facts?.storey} />
          <Row name="Room" value={facts?.room} />
          <Row name="Hosted In" value={facts?.host} />
          <Row name="Size" value={size ? metres(size) : undefined} />
          <Row name="Global ID" value={globalId} />
          <BindingRows binding={binding} />
        </TableBody>
      </Table>
    </Paper>
  );
}

function PropertiesButton(
  props: Readonly<{ hasSets: boolean; onOpen: () => void }>,
) {
  const { hasSets, onOpen } = props;
  if (!hasSets) return null;
  return (
    <Box>
      <Button size="small" variant="outlined" onClick={onOpen}>
        Properties
      </Button>
    </Box>
  );
}

function NoSelection() {
  return (
    <Typography variant="body2" color="text.secondary">
      Click an object to see what it is.
    </Typography>
  );
}

interface ObjectDetailsProps {
  globalId: string;
  facts: ObjectFacts | undefined;
  binding: Binding | undefined;
  size: { x: number; y: number; z: number } | undefined;
  sets: Array<[string, Record<string, unknown>]>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function ObjectDetails(props: Readonly<ObjectDetailsProps>) {
  const { globalId, facts, binding, size, sets, open, onOpen, onClose } = props;
  return (
    <Stack spacing={1}>
      <FactsTable
        globalId={globalId}
        facts={facts}
        binding={binding}
        size={size}
      />
      <PropertiesButton hasSets={sets.length > 0} onOpen={onOpen} />
      <PropertiesDialog
        open={open}
        onClose={onClose}
        title={facts?.name ?? facts?.ifcClass ?? 'Properties'}
        sets={sets}
      />
    </Stack>
  );
}

export function ObjectPanel(props: Readonly<ObjectPanelProps>) {
  const { globalId, facts, binding, properties, size } = props;
  const [open, setOpen] = useState(false);
  const sets = Object.entries(properties ?? {});
  if (!globalId) return <NoSelection />;

  return (
    <ObjectDetails
      globalId={globalId}
      facts={facts}
      binding={binding}
      size={size}
      sets={sets}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    />
  );
}

export default ObjectPanel;
