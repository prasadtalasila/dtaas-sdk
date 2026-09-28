/**
 * The two routes BuildingsPage answers, exactly as the host mounts them, so
 * `useParams()` sees `:model` and `?dir=` round-trips through
 * `useSearchParams()` the way it does in the real client.
 */

import { Route, Routes } from 'react-router-dom';
import BuildingsPage from 'src/dtaas/pages/BuildingsPage';
import { BIM_ROOT } from 'src/dtaas/ids';

export function BuildingsPageRoutes() {
  return (
    <Routes>
      <Route path={BIM_ROOT} element={<BuildingsPage />} />
      <Route path={`${BIM_ROOT}/models/:model`} element={<BuildingsPage />} />
    </Routes>
  );
}

export default BuildingsPageRoutes;
