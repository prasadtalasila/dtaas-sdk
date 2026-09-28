/**
 * Tests for browsing the library to choose a model folder.
 *
 * `common/models` used to be hard-coded; now the folder is whatever the host
 * passes in, and this is how a person changes it without editing a URL by
 * hand.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DirectoryPicker,
  type DirectoryPickerProps,
} from 'src/react/DirectoryPicker';
import type { LibraryEntry } from 'src/react/assets';

const tree: Record<string, LibraryEntry[]> = {
  '': [
    { name: 'projects', path: 'projects', type: 'directory' },
    { name: 'x.ifc', path: 'x.ifc', type: 'file' },
  ],
  projects: [{ name: 'aarhus', path: 'projects/aarhus', type: 'directory' }],
  'projects/aarhus': [],
};

function listOf(entries: Record<string, LibraryEntry[]>) {
  return jest.fn(
    async (path: string) => entries[path] ?? Promise.reject(new Error('gone')),
  );
}

function renderPicker(props: Partial<DirectoryPickerProps> = {}) {
  const onChange = jest.fn();
  const list = props.list ?? listOf(tree);
  render(
    <DirectoryPicker
      list={list}
      value={props.value ?? ''}
      onChange={onChange}
    />,
  );
  return { list, onChange };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Folder:/ }));
}

test('the button shows the folder in use', () => {
  renderPicker({ value: 'common/models', list: jest.fn() });
  expect(
    screen.getByRole('button', { name: 'Folder: common/models' }),
  ).toBeInTheDocument();
});

test('opening lists the subfolders of the value and hides files', async () => {
  const user = userEvent.setup();
  renderPicker({ value: '' });

  await openDialog(user);

  expect(await screen.findByText('projects')).toBeInTheDocument();
  expect(screen.queryByText('x.ifc')).not.toBeInTheDocument();
});

test('browsing into a folder and choosing it calls onChange', async () => {
  const user = userEvent.setup();
  const { onChange } = renderPicker({ value: '' });

  await openDialog(user);
  await user.click(await screen.findByText('projects'));
  await user.click(await screen.findByText('aarhus'));
  await user.click(screen.getByRole('button', { name: 'Use this folder' }));

  expect(onChange).toHaveBeenCalledWith('projects/aarhus');
  await waitFor(() =>
    expect(screen.queryByText('Choose a folder')).not.toBeInTheDocument(),
  );
});

test('Up from a subfolder reaches the root, where the folder cannot be chosen', async () => {
  const user = userEvent.setup();
  renderPicker({ value: '' });

  await openDialog(user);
  await user.click(await screen.findByText('projects'));
  await user.click(await screen.findByText('Up'));

  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Use this folder' }),
    ).toBeDisabled(),
  );
});

test('a rejected listing shows why', async () => {
  const user = userEvent.setup();
  renderPicker({ value: 'missing' });

  await openDialog(user);

  expect(
    await screen.findByText('Could not list missing: gone'),
  ).toBeInTheDocument();
});

test('a slow listing for a folder left behind does not replace the newer one', async () => {
  const user = userEvent.setup();
  let resolveAarhus: ((entries: LibraryEntry[]) => void) | undefined;
  const list = jest.fn(async (path: string) => {
    if (path === 'projects/aarhus') {
      return new Promise<LibraryEntry[]>((resolve) => {
        resolveAarhus = resolve;
      });
    }
    return tree[path] ?? Promise.reject(new Error('gone'));
  });
  renderPicker({ value: '', list });

  await openDialog(user);
  await user.click(await screen.findByText('projects'));
  await user.click(await screen.findByText('aarhus'));
  // The listing for projects/aarhus is still pending. Browse back to
  // projects, whose listing resolves at once.
  await user.click(await screen.findByText('Up'));
  expect(await screen.findByText('aarhus')).toBeInTheDocument();

  // The stale response for projects/aarhus arrives after the newer listing
  // and must not blank the folder the user is looking at now.
  resolveAarhus?.([]);
  await waitFor(() => expect(list).toHaveBeenCalledTimes(4));
  expect(screen.getByText('aarhus')).toBeInTheDocument();
});
