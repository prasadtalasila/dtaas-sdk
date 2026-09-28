import type { HeatScope } from 'src/core/readings';

/** What the property tree says about one object, as `ifc_converter.to_metadata` writes it for every object. */
export interface ObjectFacts {
  /** The name the authoring tool gave it, usually family:type:instance. */
  name?: string;
  ifcClass?: string;
  /** IFC's own subtype, for instance a door that is a GATE or a REVOLVING. */
  predefinedType?: string;
  storey?: string;
  room?: string;
  /** What it is cut into: the wall a window sits in, for instance. */
  host?: string;
  /** The property sets the model carries, by set name. */
  properties?: Record<string, Record<string, unknown>>;
}

/** The property tree, as `ifc_converter.to_metadata` writes it. */
export interface PropertyTree {
  storeys?: Array<{ name: string }>;
  rooms?: Array<{ name: string }>;
  objects?: Record<string, ObjectFacts>;
}

/** What a person has switched on. */
export interface ViewState {
  storey: string | null;
  heat: HeatScope;
  transparent: boolean;
  slabsHidden: boolean;
  selected: string | null;
  hovered: string | null;
  hoverHighlight: boolean;
  /**
   * An IFC class every member of which is highlighted, or null.
   *
   * A legend that only names colours does not answer "where are the
   * columns", which is the question in front of a grey building. Picking
   * the class in the legend answers it.
   */
  highlightedClass: string | null;
}
