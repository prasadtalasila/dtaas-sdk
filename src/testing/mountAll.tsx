import type { ComponentType } from 'react';
import { type RenderOptions, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { DtaasExtension } from 'src/extension/extension.types';
import type { HostServices } from 'src/host/hostServices.types';
import type { DigitalTwinSummary } from 'src/visualisation/digitalTwin.types';
import ConformanceBoundary from 'src/testing/ConformanceBoundary';
import renderWithHost from 'src/testing/renderWithHost';
import { SocketBlockedError } from 'src/testing/socketGuard';

export interface Mountable {
  readonly label: string;
  readonly path: string;
  readonly route: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly element: ComponentType<any>;
  readonly props: object;
}

const PENDING = 'data-conformance-pending';

/**
 * Errors are reported in the conformance result, so React's console report of
 * boundary-caught errors is silenced. The cast works around @testing-library/
 * react typing `onCaughtError` as unusable when React's option is optional.
 */
const quietErrors = { onCaughtError: () => undefined } as unknown as Pick<
  RenderOptions,
  'onCaughtError'
>;

/** Fills route parameters (`:farm`) with `sample`. */
const sampleRoute = (path: string) => path.replace(/:[^/]+/g, 'sample');

const routeMountables = (ext: DtaasExtension): Mountable[] =>
  (ext.routes ?? []).map((route, i) => {
    const path = route.path === '' ? `/${ext.id}` : `/${ext.id}/${route.path}`;
    const label = `routes[${i}] "${route.path}"`;
    return {
      label,
      path,
      route: sampleRoute(path),
      element: route.element,
      props: {},
    };
  });

/** Every page-like element an extension contributes, with sample props. */
export const collectMountables = (
  ext: DtaasExtension,
  dt: DigitalTwinSummary,
): Mountable[] => {
  const at = (
    label: string,
    element: ComponentType<object>,
    props: object,
  ) => ({
    label,
    path: '/',
    route: '/',
    element,
    props,
  });
  const panel = ext.visualisation?.inspectorPanel;
  return [
    ...routeMountables(ext),
    ...(ext.digitalTwinTabs ?? []).map((tab, i) =>
      at(
        `digitalTwinTabs[${i}] "${tab.id}"`,
        tab.element as ComponentType<object>,
        { dt },
      ),
    ),
    ...(ext.assetPreviews ?? []).map((preview, i) =>
      at(
        `assetPreviews[${i}] "${preview.id}"`,
        preview.element as ComponentType<object>,
        {
          url: 'https://dtaas.example/lib/sample',
          name: `sample${preview.extensions?.[0] ?? ''}`,
        },
      ),
    ),
    ...(panel
      ? [
          at('visualisation.inspectorPanel', panel as ComponentType<object>, {
            selection: { substrate: 'image', id: 'sample' },
          }),
        ]
      : []),
  ];
};

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Mounts one element, waits for lazy loading, and reports what went wrong. */
export const mountOne = async (
  host: HostServices,
  mountable: Mountable,
  timeoutMs: number,
): Promise<string[]> => {
  let caught: unknown;
  const { element: Element, label } = mountable;
  const view = renderWithHost(
    <ConformanceBoundary
      onError={(error) => {
        caught ??= error;
      }}
    >
      <Routes>
        <Route
          path={mountable.path}
          element={<Element {...mountable.props} />}
        />
      </Routes>
    </ConformanceBoundary>,
    {
      host,
      route: mountable.route,
      fallback: <span {...{ [PENDING]: '' }} />,
      ...quietErrors,
    },
  );
  const settled = () => {
    if (caught === undefined && view.container.querySelector(`[${PENDING}]`)) {
      throw new Error('still loading');
    }
  };
  try {
    await waitFor(settled, { timeout: timeoutMs });
  } catch {
    return [`${label}: did not finish loading within ${timeoutMs} ms`];
  } finally {
    view.unmount();
  }
  const reportable =
    caught !== undefined && !(caught instanceof SocketBlockedError);
  return reportable ? [`${label}: ${messageOf(caught)}`] : [];
};
