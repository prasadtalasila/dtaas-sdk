import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useModelRoute from 'src/dtaas/useModelRoute';

const FALLBACK = 'starting/dir';

function LocationProbe() {
  const location = useLocation();
  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
    </p>
  );
}

function RouteProbe() {
  const route = useModelRoute(FALLBACK);
  return (
    <div>
      <p data-testid="directory">{route.directory ?? 'null'}</p>
      <p data-testid="rejected">{route.rejected ?? ''}</p>
      <p data-testid="model">{route.model ?? ''}</p>
      <button type="button" onClick={() => route.selectModel('office b')}>
        selectModel
      </button>
      <button
        type="button"
        onClick={() => route.selectDirectory('projects/odense')}
      >
        selectDirectory
      </button>
    </div>
  );
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/bim" element={<RouteProbe />} />
        <Route path="/bim/models/:model" element={<RouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('useModelRoute', () => {
  it('falls back to the given directory when ?dir= is absent', () => {
    renderAt('/bim');
    expect(screen.getByTestId('directory')).toHaveTextContent(FALLBACK);
  });

  it('prefers ?dir= over the fallback', () => {
    renderAt('/bim?dir=projects/aarhus');
    expect(screen.getByTestId('directory')).toHaveTextContent(
      'projects/aarhus',
    );
  });

  it('rejects a ?dir= that could leave the library', () => {
    renderAt('/bim?dir=../x');
    expect(screen.getByTestId('directory')).toHaveTextContent('null');
    expect(screen.getByTestId('rejected')).toHaveTextContent('../x');
  });

  it('decodes the :model route param', () => {
    renderAt('/bim/models/office%20b?dir=projects/aarhus');
    expect(screen.getByTestId('model')).toHaveTextContent('office b');
  });

  it('selectModel navigates to the model route, keeping the directory', async () => {
    const user = userEvent.setup();
    renderAt('/bim?dir=projects/aarhus');

    await user.click(screen.getByRole('button', { name: 'selectModel' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/bim/models/office%20b?dir=projects/aarhus',
    );
  });

  it('selectDirectory navigates to the bim root with the new directory', async () => {
    const user = userEvent.setup();
    renderAt('/bim');

    await user.click(screen.getByRole('button', { name: 'selectDirectory' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/bim?dir=projects/odense',
    );
  });
});
