/**
 * One card per sensor, with the value that arrived and how old it is.
 *
 * The age is on every card, always. A number on a screen that nobody can date
 * is worse than no number, because a person acts on it. A card whose reading
 * has gone stale is greyed and says how long ago it last spoke, instead of
 * continuing to look current.
 *
 * Nothing here generates, interpolates or smooths a value. What is drawn is
 * what arrived, and a sensor that has said nothing says so.
 */

import type { ReactNode } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alertCounts, alertsOf, type Alert } from 'src/core/alerts';
import { idOf, objectOf, type Binding } from 'src/core/binding';
import {
  ageText,
  isLive,
  type FeedState,
  type Reading,
} from 'src/core/readings';

export interface SensorCardsProps {
  bindings: Binding[];
  /** The last value received for each object, keyed by GlobalId. */
  readings: Map<string, Reading>;
  feed: FeedState;
  /** Which object is selected, so its card is marked. */
  selected: string | null;
  onSelect: (globalId: string) => void;
}

/** How many decimals a reading is shown to. More says a precision the sensor does not have. */
const DECIMALS = 1;

function AlertSummary({
  warn,
  note,
  total,
}: Readonly<{ warn: number; note: number; total: number }>) {
  if (warn === 0 && note === 0) return null;
  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
      {warn > 0 && (
        <Chip
          size="small"
          color="warning"
          label={`${warn} of ${total} need attention`}
        />
      )}
      {note > 0 && (
        <Chip
          size="small"
          variant="outlined"
          label={`${note} not measured directly`}
        />
      )}
    </Stack>
  );
}

function AlertChips({ alerts }: Readonly<{ alerts: Alert[] }>) {
  if (alerts.length === 0) return null;
  return (
    <Stack direction="row" sx={{ gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
      {alerts.map((alert) => (
        // The chip is the short form and the tooltip is the sentence. A
        // person scanning twenty cards reads the chips, and only the one they
        // stop on needs the reason.
        <Tooltip key={alert.label} title={alert.detail}>
          <Chip
            size="small"
            color={alert.level === 'warn' ? 'warning' : 'default'}
            variant={alert.level === 'warn' ? 'filled' : 'outlined'}
            label={alert.label}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}

interface SensorCardHeaderProps {
  label: string;
  reading: Reading | undefined;
  unit: string | undefined;
}

function SensorCardHeader(props: Readonly<SensorCardHeaderProps>) {
  const { label, reading, unit } = props;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography variant="subtitle2">
        {reading === undefined
          ? 'Waiting'
          : `${reading.value.toFixed(DECIMALS)} ${unit}`}
      </Typography>
    </Box>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block' }}
    >
      {children}
    </Typography>
  );
}

interface SensorCardProps {
  binding: Binding;
  reading: Reading | undefined;
  feed: FeedState;
  selected: string | null;
  onSelect: (globalId: string) => void;
}

/** Faded once a reading has gone stale, and marked when it is the selected object's card. */
function cardStyle(live: boolean, selected: boolean) {
  return {
    opacity: live ? 1 : 0.55,
    borderColor: selected ? 'primary.main' : undefined,
  };
}

function SensorCard(props: Readonly<SensorCardProps>) {
  const { binding, reading, feed, selected, onSelect } = props;
  const globalId = objectOf(binding);
  const live = isLive(reading, feed);
  // The payload's own unit wins; a mismatch with the manifest is an alert, not a silent override.
  const unit = reading?.unit ?? binding.display?.unit;

  return (
    <Card variant="outlined" sx={cardStyle(live, globalId === selected)}>
      <CardActionArea
        sx={{ p: 1 }}
        disabled={!globalId}
        onClick={() => globalId && onSelect(globalId)}
      >
        <SensorCardHeader label={idOf(binding)} reading={reading} unit={unit} />
        <Caption>{binding.label}</Caption>
        <Caption>{ageText(reading, feed)}</Caption>
        <AlertChips alerts={alertsOf(binding, reading, feed)} />
      </CardActionArea>
    </Card>
  );
}

interface SensorCardListProps {
  bindings: Binding[];
  readings: Map<string, Reading>;
  feed: FeedState;
  selected: string | null;
  onSelect: (globalId: string) => void;
}

function SensorCardList(props: Readonly<SensorCardListProps>) {
  const { bindings, readings, feed, selected, onSelect } = props;
  return (
    <>
      {bindings.map((binding) => {
        const globalId = objectOf(binding);
        return (
          <SensorCard
            key={binding.label}
            binding={binding}
            reading={globalId ? readings.get(globalId) : undefined}
            feed={feed}
            selected={selected}
            onSelect={onSelect}
          />
        );
      })}
    </>
  );
}

export function SensorCards(props: Readonly<SensorCardsProps>) {
  const { bindings, readings, feed } = props;
  // Most architectural models declare no sensors, so this is the ordinary case.
  if (bindings.length === 0) return null;
  // What a person wants before reading twenty cards is whether any need attention.
  const counts = alertCounts(bindings, readings, objectOf, feed);

  return (
    <Stack sx={{ gap: 0.75 }}>
      <AlertSummary
        warn={counts.warn}
        note={counts.note}
        total={bindings.length}
      />
      <SensorCardList {...props} />
    </Stack>
  );
}

export default SensorCards;
