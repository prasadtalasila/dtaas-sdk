/**
 * Reading a binding.
 *
 * A manifest nests these, matching the shape DTaaS issue 1762 proposes, so a
 * reader who opens the manifest and a reader who opens the code see the same
 * names. Nothing in this file imports anything: it is the piece every
 * consumer needs, and must never pull a renderer or a validator in behind it.
 */

/** An IFC GlobalId: 22 characters of the base64 variant IFC uses. */
export const GLOBAL_ID_PATTERN = /^[0-9A-Za-z_$]{22}$/;

/** How a binding names the object it applies to. Exactly one form is given. */
export interface Selector {
  globalId?: string;
  nodeName?: string;
  expressId?: number;
}

/** How a value is drawn: its unit, and the range the colour ramp spans. */
export interface Display {
  unit: string;
  ramp: [number, number];
}

/** One sensor, bound to one object. */
export interface Binding {
  selector: Selector;
  label: string;
  source: {
    live?: { transport: 'mqtt'; topic: string };
    history?: {
      bucket: string;
      measurement: string;
      tags?: Record<string, string>;
    };
  };
  display: Display;
  /** The short tag a person says out loud, TS-01. Optional: ours, not the proposal's. */
  id?: string;
  /** The equipment the sensor sits on. Optional: ours, not the proposal's. */
  mountedOn?: string;
  /** Which measurement point on that equipment, or `TODO` when unknown. */
  role?: string;
}

/** The object a binding is attached to, or undefined for a non-IFC selector. */
export function objectOf(binding: Binding): string | undefined {
  return binding.selector?.globalId;
}

/**
 * The MQTT topic a binding listens on, or undefined when it has no live half.
 *
 * A binding may declare only `history`, which is legal: the reading exists
 * for the panel behind a click and never appears on the marker.
 */
export function topicOf(binding: Binding): string | undefined {
  return binding.source?.live?.topic;
}

/** How the value is drawn. Never undefined, so a caller need not guard it. */
export function displayOf(binding: Binding): Partial<Display> {
  return binding.display ?? {};
}

/**
 * The short tag to print on a marker.
 *
 * `id` is this project's addition, so a manifest written by someone else will
 * not have one; the label is the fallback, because a 22 character GlobalId
 * does not fit on a marker.
 */
export function idOf(binding: Binding): string {
  return binding.id ?? binding.label;
}
