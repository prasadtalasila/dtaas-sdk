/**
 * Direct tests for the model menu: what it shows before anything is chosen,
 * which `BuildingModels`' own tests never exercise because a model is always
 * picked as soon as the folder lists one.
 */

import { render, screen } from '@testing-library/react';
import { ModelPicker } from 'src/react/ModelPicker';
import type { BimModel } from 'src/react/assets';

const model: BimModel = {
  name: 'Hospital',
  title: 'Hospital',
  ifcPath: 'common/models/Hospital.ifc',
};

test('nothing is shown as chosen before a model is picked', () => {
  render(<ModelPicker models={[model]} chosen={null} onChoose={() => {}} />);

  // MUI renders the closed control's empty value as a zero-width space.
  const combobox = screen.getByRole('combobox', { name: /^IFC Model/ });
  expect(combobox.textContent).toBe('​');
});
