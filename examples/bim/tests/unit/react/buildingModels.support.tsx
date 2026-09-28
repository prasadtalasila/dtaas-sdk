/**
 * What the BuildingModels tests share: a workspace that answers the page's
 * requests, a stand-in for the canvas, and the steps a person takes.
 *
 * The canvas draws with WebGL, which jsdom does not have, and what is tested
 * is the page around the drawing. The stand-in records the props it is given,
 * counts how often it is mounted, and lets a test announce that a conversion
 * finished, which is what starts a save.
 */

import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { BimCanvasProps } from 'src/react/BimCanvas';
import type { LibraryEntry } from 'src/react/assets';
import {
  BuildingModels,
  type BuildingModelsProps,
} from 'src/react/BuildingModels';
import {
  DIRECTORY,
  LIBRARY,
  TEMPLATE,
  building,
  ifc,
  type Deferred,
} from 'tests/unit/react/buildingModels.fixtures';

export * from 'tests/unit/react/buildingModels.fixtures';

/** What the stand-in canvas was last given, and how often it was mounted. */
export const canvas: { props: BimCanvasProps | null; mounts: number } = {
  props: null,
  mounts: 0,
};

export function StandInCanvas(props: Readonly<BimCanvasProps>) {
  useEffect(() => {
    canvas.props = props;
  });
  useEffect(() => {
    canvas.mounts += 1;
  }, []);
  return (
    <div
      data-testid="canvas"
      data-url={props.url}
      data-convert={String(props.convert)}
    />
  );
}

/** The props the last render gave the stand-in canvas. */
export function canvasProps(): BimCanvasProps {
  if (!canvas.props) throw new Error('the canvas has not been rendered');
  return canvas.props;
}

/** Just enough of a `Response` for the page: jsdom in Jest has none. */
export function respond(
  body: string,
  { status = 200, type = '' }: { status?: number; type?: string } = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(type ? { 'content-type': type } : {}),
    body: null,
    json: async () => JSON.parse(body),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  } as unknown as Response;
}

const htmlPage = () => respond('<!doctype html>', { type: 'text/html' });
const data = (value: unknown) =>
  respond(JSON.stringify(value), { type: 'application/json' });

export interface Workspace {
  files: LibraryEntry[];
  heads: Record<string, string>;
  json: Record<string, unknown>;
  listing: 'ok' | 'page' | 'error';
  gate: Deferred<void> | null;
  cached: unknown;
}

function answerListing(state: Workspace, init: RequestInit): Response {
  if (state.listing === 'page') return htmlPage();
  if (state.listing === 'error') return respond('', { status: 500 });
  // Jupyter sends the listing with Last-Modified and no Cache-Control, so a
  // browser may answer a later request from its cache. A request that does
  // not opt out gets the first listing again, as it could in a tab.
  if (init.cache !== 'no-store' && state.cached) return data(state.cached);
  state.cached = { type: 'directory', content: [...state.files] };
  return data({ type: 'directory', content: state.files });
}

async function answerFile(state: Workspace, address: string) {
  const name = decodeURIComponent(address.split('/').pop() ?? '');
  if (name in state.json) {
    return state.json[name] === 'page' ? htmlPage() : data(state.json[name]);
  }
  if (state.gate) await state.gate.promise;
  return respond(state.heads[name] ?? '', { status: 206 });
}

/**
 * A workspace to answer the page's requests.
 *
 * `files` is what the models directory lists, `heads` is the start of each IFC
 * file, and `gate`, when set, holds every name read until it is opened, so a
 * test can look at the page before the names arrive.
 */
export function workspace(options: Partial<Workspace> = {}): Workspace {
  const state: Workspace = {
    files: [...(options.files ?? [])],
    heads: options.heads ?? {},
    json: options.json ?? {},
    listing: options.listing ?? 'ok',
    gate: null,
    cached: null,
  };
  globalThis.fetch = jest.fn(async (url: RequestInfo | URL, init = {}) => {
    const address = String(url);
    if (address.includes('/api/contents/')) return answerListing(state, init);
    if (address.includes('/files/')) return answerFile(state, address);
    return respond('', { status: 404 });
  }) as typeof fetch;
  return state;
}

/** Open a gate and let the page take in what it was holding back. */
export async function open(gate: Deferred<void>) {
  await act(async () => {
    gate.resolve();
    await gate.promise;
  });
}

/** The page as a host mounts it, in the models folder unless told otherwise. */
export function page(props: Partial<BuildingModelsProps> = {}) {
  return (
    <BuildingModels libraryUrl={LIBRARY} directory={DIRECTORY} {...props} />
  );
}

export function show(props: Partial<BuildingModelsProps> = {}) {
  return render(page(props));
}

export const modelMenu = () =>
  screen.getByRole('combobox', { name: /^IFC Model/ });

/** Open the model menu and return the text of each option. */
export async function menuOptions(user: UserEvent) {
  await user.click(modelMenu());
  const options = await screen.findAllByRole('option');
  return options.map((option) => option.textContent ?? '');
}

export async function choose(user: UserEvent, name: string) {
  await user.click(modelMenu());
  await user.click(
    await screen.findByRole('option', { name: new RegExp(name) }),
  );
  return screen.findByTestId('canvas');
}

/** The canvas says it is ready, with a real view and a handle that records. */
export async function viewerReady() {
  const view = building();
  const looked: string[] = [];
  const painted = { count: 0 };
  await act(async () => {
    canvasProps().onReady?.({
      view,
      frame: () => {},
      look: (from) => looked.push(from),
      drawField: () => {
        painted.count += 1;
      },
    });
  });
  return { view, looked, painted };
}

/** A model with its property tree and its manifest beside it. */
export function withSidecars(manifest: unknown) {
  return workspace({
    files: [
      ifc('Building_1912_AK_v4.ifc'),
      {
        name: 'Building_1912_AK_v4.json',
        path: `${DIRECTORY}/Building_1912_AK_v4.json`,
      },
      {
        name: 'Building_1912_AK_v4.manifest.json',
        path: `${DIRECTORY}/Building_1912_AK_v4.manifest.json`,
      },
    ],
    heads: { 'Building_1912_AK_v4.ifc': TEMPLATE },
    json: {
      'Building_1912_AK_v4.json': {
        storeys: [{ name: 'L1' }],
        objects: { w1: { ifcClass: 'IfcWall' } },
      },
      'Building_1912_AK_v4.manifest.json': manifest,
    },
  });
}

/** One model on its own, the setting most tests start from. */
export function oneModel() {
  return workspace({
    files: [ifc('Building_1912_AK_v4.ifc')],
    heads: { 'Building_1912_AK_v4.ifc': TEMPLATE },
  });
}
