/**
 * Holding the state of one loaded model, and applying it to the scene.
 *
 * `paintFor` (in `sceneSelection.ts`) is the only thing that decides what an
 * object is painted with, and `visibilityOf` (in `sceneBands.ts`) is the
 * only thing that writes `visible`; both were bought with bugs from several
 * places writing either. This owns no canvas, camera or renderer, so it can
 * be driven by React, by plain JavaScript, or by a test.
 */

import { type Group, Mesh } from 'three';

import { objectOf, type Binding } from 'src/core/binding';
import {
  DEFAULT_STALE_AFTER_S,
  availableScopes,
  zoneOf,
  type FeedState,
  type HeatScope,
  type Reading,
} from 'src/core/readings';
import { zonesOf, type Zones } from 'src/core/zones';
import { bandOf, type Band } from 'src/core/storeys';
import { type Glow } from 'src/viewer/glow';
import { Palette } from 'src/viewer/appearance';
import { type Field } from 'src/viewer/field';
import { collectMeshes, bandsOf, visibilityOf } from 'src/viewer/sceneBands';
import { fieldFor, sensorZoneFor } from 'src/viewer/sceneHeat';
import { paintAll, syncGlow } from 'src/viewer/sceneSelection';
import {
  countByClass,
  colourByClass,
  sizeOfObject,
  liveCountOf,
} from 'src/viewer/sceneSummary';
import type {
  ObjectFacts,
  PropertyTree,
  ViewState,
} from 'src/viewer/sceneView.types';

export class SceneView {
  readonly meshes: Map<string, Mesh>;

  readonly bands: Band[];

  private readonly palette = new Palette();

  private readonly hiddenByHand: string[] = [];

  private zones: Zones | null = null;

  /** The zone averages in force, for anything drawing the field beside the model. */
  get heatZones(): Zones | null {
    return this.zones;
  }

  /** The grid saying which sensor's walk reaches each point of the floor. */
  field: Field | null = null;

  /** The GlobalId behind each index in the field, in the order it was fed. */
  private fieldSources: string[] = [];

  /** The bindings the field was built from, so it is rebuilt only when they change. */
  private fieldKey = '';

  private glow: Glow | null = null;

  state: ViewState = {
    storey: null,
    heat: 'off',
    transparent: false,
    slabsHidden: false,
    selected: null,
    hovered: null,
    hoverHighlight: true,
    highlightedClass: null,
  };

  constructor(
    model: Group,
    private readonly tree: PropertyTree = {},
  ) {
    const { meshes, base } = collectMeshes(model, this.palette);
    this.meshes = meshes;
    this.bands = bandsOf(tree, base);
  }

  /** The floors a person can choose, one entry per distinct band. */
  get storeys(): string[] {
    return this.bands.map((band) => band.names[0]);
  }

  /** The heat scopes worth offering for a set of bindings, asked of the readings and not the model. */
  scopesFor(bindings: Binding[]): HeatScope[] {
    this.buildField(bindings);
    return availableScopes(bindings, (globalId, scope) =>
      this.zoneFor(globalId, scope),
    );
  }

  /** How many objects of each class the model holds. */
  classCounts(): Map<string, number> {
    return countByClass(this.meshes);
  }

  /** The colour the model gives each class of object, for a legend to state. */
  classColours(): Map<string, string> {
    return colourByClass(this.meshes, this.palette);
  }

  factsOf(globalId: string): ObjectFacts | undefined {
    return this.tree.objects?.[globalId];
  }

  /** How large an object is, in metres, along each world axis. */
  sizeOf(globalId: string): { x: number; y: number; z: number } | undefined {
    return sizeOfObject(this.meshes, globalId);
  }

  /** Take in the readings and work out the zone averages. The repaint is a separate call, so a caller can batch a burst of messages into one. */
  applyReadings(
    bindings: Binding[],
    readings: Map<string, Reading>,
    feed: FeedState,
    staleAfter = DEFAULT_STALE_AFTER_S,
    now = Date.now(),
  ): void {
    this.buildField(bindings);
    this.zones = zonesOf(
      bindings,
      readings,
      this.state.heat,
      (globalId) => this.zoneFor(globalId),
      feed,
      staleAfter,
      now,
    );
  }

  /** Which zone an object is in, at a scope. Per Sensor is the only one of the four that says anything on a model with no rooms and one storey. */
  zoneFor(
    globalId: string,
    scope: HeatScope = this.state.heat,
  ): string | undefined {
    if (scope !== 'sensor') return zoneOf(scope, this.factsOf(globalId));
    return sensorZoneFor(this.meshes, this.field, this.fieldSources, globalId);
  }

  /** The zone one cell of the field belongs to, or undefined where none reaches. */
  zoneAtCell(index: number): string | undefined {
    if (this.field === null) return undefined;
    const source = this.field.owner[index];
    return source < 0 ? undefined : this.fieldSources[source];
  }

  /** Rasterise the floor and flood it from the sensors. Rebuilt only when the bindings or the chosen storey change. */
  buildField(bindings: Binding[]): void {
    const key = [
      this.state.storey,
      ...bindings.map((b) => objectOf(b) ?? ''),
    ].join(',');
    if (key === this.fieldKey) return;
    this.fieldKey = key;

    const { field, fieldSources } = fieldFor(
      this.meshes,
      bindings,
      this.bands,
      this.state.storey,
    );
    this.field = field;
    this.fieldSources = fieldSources;
  }

  /** Lend this view a halo to put around the selected object. The halo lives in the scene, so it is handed in instead of made here. */
  attachGlow(glow: Glow | null): void {
    this.glow = glow;
    this.refreshMaterials();
  }

  /** Paint everything. Called by anything that changes appearance. */
  refreshMaterials(): void {
    paintAll(this.meshes, this.state, this.palette, this.zones, (id) =>
      this.zoneFor(id),
    );
    syncGlow(this.glow, this.meshes, this.state.selected);
  }

  /** The floor and lid filters, and anything hidden by hand. */
  refreshVisibility(): void {
    const band = this.state.storey
      ? bandOf(this.bands, this.state.storey)
      : undefined;
    visibilityOf(this.meshes, band, this.state.slabsHidden, this.hiddenByHand);
  }

  /** Both, for the common case of a state change that affects both. */
  refresh(): void {
    this.refreshVisibility();
    this.refreshMaterials();
  }

  /** Hide one object, so a person can look past it. */
  hide(globalId: string): void {
    if (!this.meshes.has(globalId) || this.hiddenByHand.includes(globalId))
      return;
    this.hiddenByHand.push(globalId);
    this.refreshVisibility();
  }

  /** Bring back the last object hidden, so they come back in the order they went. */
  restoreLastHidden(): void {
    if (this.hiddenByHand.pop()) this.refreshVisibility();
  }

  /** Undo every toggle, so a model reads as it did when it opened. */
  reset(): void {
    this.hiddenByHand.length = 0;
    this.state = {
      ...this.state,
      storey: null,
      heat: 'off',
      transparent: false,
      slabsHidden: false,
      selected: null,
      hovered: null,
    };
    this.zones = null;
    this.refresh();
  }

  /** Which sensors are currently worth colouring by, for a legend to state. */
  liveCount(
    bindings: Binding[],
    readings: Map<string, Reading>,
    feed: FeedState,
    staleAfter = DEFAULT_STALE_AFTER_S,
    now = Date.now(),
  ): number {
    return liveCountOf(bindings, readings, feed, staleAfter, now);
  }

  dispose(): void {
    this.palette.dispose();
    this.meshes.clear();
  }
}

export default SceneView;
