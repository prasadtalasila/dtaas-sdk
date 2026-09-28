import { entries, type Loose } from 'src/extension/validation/validationUtils';

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** `/bim`, `/bim/x`, `/bim?q` and `/bim#h` are under `/bim`; `/bimx` is not. */
const isUnder = (path: string, prefix: string) =>
  path.startsWith(prefix) &&
  (path.length === prefix.length ||
    ['/', '?', '#'].includes(path.charAt(prefix.length)));

/** Menu items stay inside the extension's own `/<id>` mount point. */
const checkNavigation = (ext: Loose): string[] => {
  if (typeof ext.id !== 'string' || !ID_PATTERN.test(ext.id)) return [];
  const prefix = `/${ext.id}`;
  return entries(ext.navigation).flatMap(({ item, index }) =>
    typeof item.path !== 'string' || isUnder(item.path, prefix)
      ? []
      : [`navigation[${index}].path "${item.path}" must be under "${prefix}"`],
  );
};

export default checkNavigation;
